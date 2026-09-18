#!/usr/bin/env node
/**
 * smoke.mjs — is the deployed site actually working, for a signed-in person?
 *
 * Usage: npm run smoke                      (production)
 *        npm run smoke -- http://localhost:3000
 *
 * Creates a throwaway account, signs it in, loads every signed-in page and
 * checks what a person would notice: the page answered, every streamed
 * section arrived, nothing fell through to an error boundary, and the frame
 * knows who you are. Then checks the doors a stranger uses, and that a
 * stranger is turned away from the rest. The account is deleted at the end
 * whether or not anything failed.
 *
 * Why it exists: every signed-in page streams its frame first and its body
 * behind a Suspense boundary. A body that throws no longer fails the
 * response — the status is still 200 and the frame still renders — so
 * "curl says 200" stopped meaning "the page works". This reads the stream
 * the way the browser does.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY from .env.local. Touches only its own account.
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
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error("✗ Missing Supabase keys in .env.local");
  process.exit(1);
}

const BASE = (process.argv[2] ?? "https://www.peoplearound.com").replace(/\/$/, "");
const NAME = "Smoke Test";

/** Signed-in pages and one thing each must contain once its body has streamed in. */
const PAGES = [
  ["/people", 'id="feed"'],
  ["/events", ">Events<"],
  ["/explore", "Explore communities"],
  ["/offers", ">Offers<"],
  ["/ideas", ">Projects<"],
  ["/faves", "Local Faves"],
  ["/chats", ">Chats<"],
  ["/profile", NAME],
  ["/connections", "My connections"],
  ["/recap", "<main"],
  ["/settings", "Edit profile"],
  ["/invite", "Invite neighbors"],
  ["/help", "Help Center"],
  ["/analytics", "Your analytics"],
  ["/clans", "Your clans"],
];

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const failures = [];
let userId = null;

function check(ok, label, detail = "") {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function load(path, cookie) {
  const t = performance.now();
  const res = await fetch(BASE + path, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const html = res.status === 200 ? await res.text() : "";
  return { res, html, ms: Math.round(performance.now() - t) };
}

try {
  // --- an account of our own, in the busiest community so pages have content
  const email = `smoke-${Date.now()}@peoplearound.test`;
  const password = `Sm!${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}A1`;
  const { data: made, error: makeErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (makeErr) throw makeErr;
  userId = made.user.id;

  const { data: projects } = await admin
    .from("projects")
    .select("neighborhood_id")
    .neq("state", "archived")
    .not("neighborhood_id", "is", null)
    .limit(500);
  const tally = new Map();
  for (const p of projects ?? []) tally.set(p.neighborhood_id, (tally.get(p.neighborhood_id) ?? 0) + 1);
  const home = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  if (home) {
    await admin.from("community_members").insert({ community_id: home, user_id: userId });
  }
  await admin.from("profiles").update({ display_name: NAME, neighborhood_id: home }).eq("id", userId);

  // --- the session cookie, minted exactly the way the site's own client writes it
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  const jar = new Map();
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (all) => all.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  await ssr.auth.setSession({
    access_token: signed.session.access_token,
    refresh_token: signed.session.refresh_token,
  });
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  // A project this account is allowed to see, for the detail page.
  const { data: visible } = await anon.from("projects").select("id,title").neq("state", "archived").limit(1);
  const pages = [...PAGES];
  if (visible?.[0]) pages.push([`/projects/${visible[0].id}`, visible[0].title.slice(0, 20)]);

  console.log(`\n  ${BASE}\n`);
  for (const [path, marker] of pages) {
    const { res, html, ms } = await load(path, cookie);
    const pending = (html.match(/<template id="B:/g) ?? []).length;
    const resolved = (html.match(/\$RC\("B:/g) ?? []).length;
    const notes = [];
    if (res.status !== 200) notes.push(`HTTP ${res.status}`);
    if (pending !== resolved) notes.push(`${pending - resolved} streamed section(s) never arrived`);
    if (html.includes("NEXT_HTTP_ERROR_FALLBACK")) notes.push("fell through to not-found");
    if (html.includes("Something went wrong on our side")) notes.push("error boundary");
    if (html.includes("Application error")) notes.push("application error");
    if (res.status === 200 && !html.includes(marker)) notes.push(`missing “${marker}”`);
    if (res.status === 200 && !html.includes(NAME)) notes.push("frame does not know who you are");
    const ok = check(notes.length === 0, path, notes.join("; "));
    console.log(`  ${ok ? "✓" : "✗"} ${path.padEnd(48)} ${String(ms).padStart(5)}ms${ok ? "" : "   " + notes.join("; ")}`);
  }

  // --- the doors a stranger uses
  console.log("");
  for (const path of ["/login", "/start", "/privacy", "/city", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
    const { res, ms } = await load(path, null);
    const ok = check(res.status === 200, `${path} (signed out)`, `HTTP ${res.status}`);
    console.log(`  ${ok ? "✓" : "✗"} ${(path + "  (signed out)").padEnd(48)} ${String(ms).padStart(5)}ms${ok ? "" : `   HTTP ${res.status}`}`);
  }
  // --- and that a stranger is turned away from the rest
  {
    const { res } = await load("/people", null);
    const to = res.headers.get("location") ?? "";
    const ok = check(res.status >= 300 && res.status < 400 && to.includes("/login"), "/people (signed out)", `expected a redirect to /login, got HTTP ${res.status} ${to}`);
    console.log(`  ${ok ? "✓" : "✗"} ${"/people  (signed out → /login)".padEnd(48)}`);
  }
} catch (e) {
  failures.push(`the test itself failed: ${e?.message ?? e}`);
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error(`\n  ! could not delete ${userId}: ${error.message} — remove it by hand`);
  }
}

if (failures.length) {
  console.error(`\n  ✗ ${failures.length} problem(s):\n${failures.map((f) => "    · " + f).join("\n")}\n`);
  process.exit(1);
}
console.log("\n  ✓ everything a signed-in neighbor would touch is working\n");
