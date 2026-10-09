import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekSummary, type CoachDoc } from "@/lib/coach";

/**
 * GET /api/weekly-insights — the week's news, brought to the people it is
 * about. Vercel Cron, Mondays 15:00 UTC (vercel.json), `Bearer CRON_SECRET`.
 *
 * For every real person who runs something (insight_recipients, migration
 * 0080 — never demo or test accounts, and never twice in six days), one
 * notification: how their week went and the single most useful next step.
 * "Your week on “Repair café”: 14 views (+6 on last week) · 2 new stars.
 * Next: 2 neighbors want to join." It lands in the bell, and on their phone
 * within ten minutes if they turned push on.
 *
 * The sentence is built by the same rules as the home page and the project
 * page (src/lib/coach.ts), so the notification can never disagree with what
 * they see when they tap it.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PER_RUN = 500;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data, error } = await admin.rpc("insight_recipients");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // A set-returning function comes back as bare values or as rows,
  // depending on the PostgREST version; accept either.
  const ids = ((data ?? []) as unknown[])
    .map((r) =>
      typeof r === "string"
        ? r
        : (r as { insight_recipients?: string })?.insight_recipients,
    )
    .filter((v): v is string => typeof v === "string");

  let sent = 0;
  for (const userId of ids.slice(0, MAX_PER_RUN)) {
    const { data: doc } = await admin.rpc("coach_material", { p_user: userId });
    const summary = doc ? weekSummary(doc as CoachDoc) : null;
    if (!summary) continue;
    const { error: insertError } = await admin.from("notifications").insert({
      user_id: userId,
      kind: "insight",
      body: summary.body,
      href: summary.href,
    });
    if (!insertError) sent += 1;
  }

  return NextResponse.json({ recipients: ids.length, sent });
}
