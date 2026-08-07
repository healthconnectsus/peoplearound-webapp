import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * GET /api/push — deliver pending notifications as web pushes.
 * Vercel Cron, every 10 minutes (vercel.json), `Bearer CRON_SECRET`.
 *
 * Pull, not trigger: notifications are written by Postgres triggers (0025)
 * and this job drains the undelivered ones. Anything already read in-app is
 * skipped — if you were in the tab when it happened, your phone stays quiet.
 * That ten-minute lag is a feature, not a limitation: this product's whole
 * posture is that a neighborhood is not an emergency (UX_SPEC §6).
 */

const MAX_PER_RUN = 400;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const admin = createAdminClient();
  if (!admin || !publicKey || !privateKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  webpush.setVapidDetails(
    "mailto:hello@peoplearound.com",
    publicKey,
    privateKey,
  );

  const { data, error } = await admin.rpc("pending_pushes", {
    p_limit: MAX_PER_RUN,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as {
    notification_id: string;
    body: string;
    href: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peoplearound.com";
  const dead: string[] = [];
  const delivered = new Set<string>();

  await Promise.all(
    rows.map(async (r) => {
      const payload = JSON.stringify({
        body: r.body,
        href: r.href.startsWith("http") ? r.href : `${base}${r.href}`,
        tag: r.notification_id,
      });
      try {
        await webpush.sendNotification(
          {
            endpoint: r.endpoint,
            keys: { p256dh: r.p256dh, auth: r.auth },
          },
          payload,
          { TTL: 6 * 60 * 60 },
        );
        delivered.add(r.notification_id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The device unsubscribed or the endpoint expired — stop trying.
          dead.push(r.endpoint);
          delivered.add(r.notification_id);
        }
        // Anything else (5xx, network) is left unmarked and retried next run.
      }
    }),
  );

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  if (delivered.size > 0) {
    await admin
      .from("notifications")
      .update({ pushed_at: new Date().toISOString() })
      .in("id", [...delivered]);
  }

  return NextResponse.json({
    ok: true,
    sent: delivered.size,
    pruned: dead.length,
  });
}
