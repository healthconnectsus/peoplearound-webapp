import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * GET /api/digest — the weekly "your neighborhood this week" email.
 * Triggered by Vercel Cron (Saturdays 15:00 UTC, see vercel.json) with
 * `Authorization: Bearer CRON_SECRET`.
 *
 * Calm by design (UX_SPEC: no dopamine drip): ONE email a week, only to
 * people whose neighborhood actually had life this week or who have unread
 * notifications — a quiet week sends nothing. Opt-out respected
 * (profiles.digest_opt_out); demo accounts (@example.com) skipped.
 */

const ALERT_FROM =
  process.env.ALERT_FROM ?? "Peoplearound <onboarding@resend.dev>";
const MAX_SENDS_PER_RUN = 200; // safety valve; raise deliberately with scale

type Item = { title: string; href: string };

function digestHtml(args: {
  name: string;
  hood: string;
  ideas: Item[];
  events: Item[];
  unread: number;
}) {
  const list = (items: Item[]) =>
    items
      .map(
        (i) =>
          `<li style="margin:0 0 6px;"><a href="${i.href}" style="color:#059669;text-decoration:none;">${i.title}</a></li>`,
      )
      .join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <tr><td style="background:linear-gradient(135deg,#059669,#0d9488);background-color:#059669;padding:24px 32px;">
      <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-.5px;">people<span style="opacity:.85;">around</span></span>
    </td></tr>
    <tr><td style="padding:28px 32px;">
      <h1 style="margin:0 0 8px;font-size:19px;color:#18181b;">${args.hood} this week</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b;">Hi ${args.name} — here's what moved around you.</p>
      ${args.ideas.length ? `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3f3f46;">💡 New ideas</p><ul style="margin:0 0 18px;padding-left:18px;font-size:14px;">${list(args.ideas)}</ul>` : ""}
      ${args.events.length ? `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3f3f46;">📅 Coming up</p><ul style="margin:0 0 18px;padding-left:18px;font-size:14px;">${list(args.events)}</ul>` : ""}
      ${args.unread ? `<p style="margin:0 0 18px;font-size:14px;color:#52525b;">🔔 You have <a href="https://peoplearound.com" style="color:#059669;">${args.unread} unread notification${args.unread === 1 ? "" : "s"}</a>.</p>` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#059669;">
        <a href="https://peoplearound.com" style="display:inline-block;padding:11px 26px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:999px;">See what's happening</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid #f4f4f5;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">One email a week, only when something happened.<br/>Turn it off anytime in <a href="https://peoplearound.com/settings" style="color:#059669;text-decoration:none;">Settings</a>.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  const admin = createAdminClient();
  if (!admin || !resendKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString();

  // This week's material, grouped by neighborhood.
  const [{ data: newProjects }, { data: soonEvents }] = await Promise.all([
    admin
      .from("projects")
      .select("id,title,neighborhood_id")
      .gte("created_at", weekAgo)
      .neq("state", "archived"),
    admin
      .from("events")
      .select("id,title,project_id,starts_at,project:projects(neighborhood_id)")
      .gte("starts_at", new Date().toISOString())
      .lte("starts_at", weekAhead),
  ]);

  const ideasByHood = new Map<string, Item[]>();
  for (const p of (newProjects ?? []) as {
    id: string;
    title: string;
    neighborhood_id: string | null;
  }[]) {
    if (!p.neighborhood_id) continue;
    const arr = ideasByHood.get(p.neighborhood_id) ?? [];
    arr.push({ title: p.title, href: `https://peoplearound.com/projects/${p.id}` });
    ideasByHood.set(p.neighborhood_id, arr);
  }
  const eventsByHood = new Map<string, Item[]>();
  for (const e of (soonEvents ?? []) as unknown as {
    title: string;
    project_id: string;
    project?: { neighborhood_id: string | null } | null;
  }[]) {
    const hood = e.project?.neighborhood_id;
    if (!hood) continue;
    const arr = eventsByHood.get(hood) ?? [];
    arr.push({ title: e.title, href: `https://peoplearound.com/projects/${e.project_id}` });
    eventsByHood.set(hood, arr);
  }

  // Recipients: real accounts, opted in, with a neighborhood.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,display_name,neighborhood_id,digest_opt_out,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name)")
    .not("neighborhood_id", "is", null)
    .eq("digest_opt_out", false);

  const { data: unreadRows } = await admin
    .from("notifications")
    .select("user_id")
    .is("read_at", null);
  const unreadBy = new Map<string, number>();
  for (const r of unreadRows ?? []) {
    unreadBy.set(r.user_id, (unreadBy.get(r.user_id) ?? 0) + 1);
  }

  // Emails live in auth.users; page through them once.
  const emailById = new Map<string, string>();
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (u.email) emailById.set(u.id, u.email);
    }
    if (!data || data.users.length < 1000) break;
  }

  let sent = 0;
  let skipped = 0;
  for (const p of (profiles ?? []) as unknown as {
    id: string;
    display_name: string | null;
    neighborhood_id: string;
    neighborhood?: { name: string } | null;
  }[]) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    const email = emailById.get(p.id);
    if (!email || email.endsWith("@example.com")) {
      skipped++;
      continue;
    }
    const ideas = (ideasByHood.get(p.neighborhood_id) ?? []).slice(0, 5);
    const events = (eventsByHood.get(p.neighborhood_id) ?? []).slice(0, 5);
    const unread = unreadBy.get(p.id) ?? 0;
    // A quiet week sends nothing — that's the promise.
    if (ideas.length === 0 && events.length === 0 && unread === 0) {
      skipped++;
      continue;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [email],
        subject: `${p.neighborhood?.name ?? "Your neighborhood"} this week 🌱`,
        html: digestHtml({
          name: p.display_name ?? "neighbor",
          hood: p.neighborhood?.name ?? "Your neighborhood",
          ideas,
          events,
          unread,
        }),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) sent++;
    else console.warn("[digest] send failed:", email, await res.text());
  }

  return NextResponse.json({ sent, skipped });
}
