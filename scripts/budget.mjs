#!/usr/bin/env node
/**
 * budget.mjs — how many database queries does each page cost?
 *
 * Usage: npm run budget                      (production)
 *        npm run budget -- http://localhost:3000
 *
 * Creates a throwaway account, loads each page several times, and measures
 * the cost from the database's own side: the change in `pg_stat_statements`
 * for the `authenticated` role, divided by the number of loads. Fails if a
 * page exceeds its budget. The account is deleted at the end either way.
 *
 * Why this exists. Page speed here is dominated not by slow SQL — no
 * application query averages over 200ms — but by how many separate requests
 * a render makes, because roughly one database read in twenty-five takes
 * between a third of a second and two seconds and a page is as slow as its
 * slowest read. Over one night the total across these pages went from 273 to
 * about 160. Nothing stops the next feature from putting it back except a
 * number that fails.
 *
 * Reading the units: one PostgREST request shows up here as about two
 * statements — one to set the role for the request, one for the query
 * itself. `/help` makes exactly one request (the frame's `shell_state`) and
 * measures 2. So halve these numbers to think in requests.
 *
 * The budgets below are the measured cost plus a little headroom. Raise one
 * deliberately, in a commit that says why, rather than because it went red.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const BASE = (process.argv[2] ?? "https://www.peoplearound.com").replace(/\/$/, "");
const RUNS = 6;

/** Statements per load, at which each page is considered to have regressed. */
const BUDGET = {
  "/people": 24,
  // 16 for the fresh account this script signs in as; 12 once an account is
  // past the thirty days in which the onboarding nudge can show.
  "/explore": 20,
  "/profile": 8,
  "/events": 14,
  "/ideas": 10,
  "/offers": 12,
  "/recap": 16,
  "/analytics": 18,
  "/faves": 8,
  "/connections": 10,
  "/clans": 10,
  "/chats": 8,
  "/settings": 8,
  "/invite": 8,
  "/help": 4,
  "/projects/[id]": 10,
};

async function sql(query) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!r.ok) throw new Error(`Management API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const statementsSoFar = async () =>
  Number(
    (
      await sql(
        "select coalesce(sum(s.calls),0) as n from extensions.pg_stat_statements s " +
          "join pg_roles r on r.oid = s.userid where r.rolname = 'authenticated'",
      )
    )[0].n,
  );

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const email = `qa-budget-${Date.now()}@peoplearound.test`;
const password = `Qa!${Math.random().toString(36).slice(2)}Aa1`;
const { data: made, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error) throw error;
const uid = made.user.id;
const over = [];

try {
  // Join wherever the most is happening, so no page measures an empty state.
  const { data: ps } = await admin
    .from("projects")
    .select("id,neighborhood_id")
    .neq("state", "archived")
    .not("neighborhood_id", "is", null)
    .limit(500);
  const tally = new Map();
  for (const p of ps ?? []) tally.set(p.neighborhood_id, (tally.get(p.neighborhood_id) ?? 0) + 1);
  const home = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  if (home) await admin.from("community_members").insert({ community_id: home, user_id: uid });
  await admin.from("profiles").update({ display_name: "QA Budget", neighborhood_id: home }).eq("id", uid);

  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: session } = await anon.auth.signInWithPassword({ email, password });
  const jar = new Map();
  const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (all) => all.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  await ssr.auth.setSession({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  });
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const { data: visible } = await anon.from("projects").select("id").neq("state", "archived").limit(1);

  console.log(`\n  ${BASE}   (median of ${RUNS} loads; ~2 statements per API request)\n`);
  let total = 0;
  for (const [route, budget] of Object.entries(BUDGET)) {
    const path = route === "/projects/[id]" ? `/projects/${visible?.[0]?.id}` : route;
    if (path.endsWith("undefined")) continue;
    await fetch(BASE + path, { headers: { cookie } }).then((r) => r.text()); // warm
    const before = await statementsSoFar();
    for (let i = 0; i < RUNS; i++) await fetch(BASE + path, { headers: { cookie } }).then((r) => r.text());
    const per = (await statementsSoFar() - before) / RUNS;
    total += per;
    const ok = per <= budget;
    if (!ok) over.push(`${route}: ${per.toFixed(1)} statements, budget ${budget}`);
    console.log(
      `  ${ok ? "✓" : "✗"} ${route.padEnd(18)} ${per.toFixed(1).padStart(6)}  (budget ${String(budget).padStart(3)})`,
    );
  }
  console.log(`\n  total across these pages: ${total.toFixed(0)} statements`);
} catch (e) {
  over.push(`the measurement itself failed: ${e?.message ?? e}`);
} finally {
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) console.error(`\n  ! could not delete ${uid}: ${delErr.message} — remove it by hand`);
}

if (over.length) {
  console.error(`\n  ✗ over budget:\n${over.map((o) => "    · " + o).join("\n")}\n`);
  process.exit(1);
}
console.log("\n  ✓ every page is within its query budget\n");
