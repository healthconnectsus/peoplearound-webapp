import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * GET /api/gardener — the AI Gardener's second job (PRD §3.9).
 *
 * Finds quiet projects and writes ONE private nudge for the founder:
 *  • stall (7–21 days quiet) — one small concrete next step. Coach, not judge.
 *  • off-ramp (21+ days quiet) — a smaller version, or a warm suggestion to
 *    join something nearby. Never the word "failed", never public.
 *
 * Cron: Wednesdays 16:00 UTC (vercel.json), same bearer-token gate as the
 * digest. Runs on DeepSeek (fractions of a cent per nudge), capped per run.
 * The agent's success metric stays human joins/contributions — this exists
 * to prevent quiet death, not to farm interactions.
 */

const MAX_PER_RUN = 15;

const SYSTEM = `You are the gardener for Peoplearound, a hyperlocal app where neighbors share ideas and join each other to build them.

You write ONE short private message to the founder of a project that hasn't attracted anyone yet. Rules:
- Warm, plain, human. Like a neighbor who noticed, not a growth email.
- Max 45 words. No greeting, no sign-off, no emoji spam (one at most).
- NEVER say or imply the project failed, is dying, or is unpopular. Never mention counts of stars or members.
- "stall" → suggest ONE small concrete next step suited to this specific idea (a date, a place, a first tiny ask, a photo).
- "offramp" → gently offer a smaller version of the idea OR encourage joining a neighbor's project instead. Keep dignity; make either choice feel good.
- Address the founder as "you". Be specific to their idea, not generic.`;

async function writeNudge(p: {
  title: string;
  description: string;
  category: string;
  kind: string;
  age_days: number;
}): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Nudge type: ${p.kind}\nShared ${p.age_days} days ago\nCategory: ${p.category}\nTitle: ${p.title}\nDescription: ${p.description?.slice(0, 800) ?? ""}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn("[gardener] deepseek", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    return text ? text.slice(0, 600) : null;
  } catch (e) {
    console.warn("[gardener] failed:", e);
    return null;
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data, error } = await admin.rpc("nudge_candidates", {
    p_limit: MAX_PER_RUN,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = (data ?? []) as {
    project_id: string;
    title: string;
    description: string;
    category: string;
    age_days: number;
    kind: string;
  }[];

  let written = 0;
  for (const c of candidates) {
    const body = await writeNudge(c);
    if (!body) continue;
    const { error: insErr } = await admin
      .from("project_nudges")
      .insert({ project_id: c.project_id, kind: c.kind, body });
    if (!insErr) written++;
  }

  return NextResponse.json({ candidates: candidates.length, written });
}
