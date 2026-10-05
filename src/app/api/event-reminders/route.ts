import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/event-reminders — "tomorrow at 2pm: park cleanup".
 * Vercel Cron, once a day (vercel.json), `Bearer CRON_SECRET`.
 *
 * Does nothing itself: send_event_reminders() (migration 0077) finds the
 * events happening in the next 12 to 36 hours, writes one notification per
 * person coming or down for a job, and records that it did — so running this
 * twice reminds nobody twice. The push job then delivers them within ten
 * minutes, to whoever turned phone notifications on.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data, error } = await admin.rpc("send_event_reminders");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reminded: data ?? 0 });
}
