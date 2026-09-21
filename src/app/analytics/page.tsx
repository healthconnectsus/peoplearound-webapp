import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { categoryMeta, recentDayKeys, STATE_META, timeAgo } from "@/lib/projects";
import { computeImpact } from "@/lib/impact";
import { currentProfile } from "@/lib/profile";
import { adminUserGrowth } from "@/lib/adminStats";
import { FunnelBar, Stat } from "./parts";
import { UserGrowth } from "./UserGrowth";

export const metadata = { title: "Your analytics" };

/**
 * Your ideas, honestly measured — private to you. Views → stars → join
 * requests → teammates is the funnel that matters: it answers "is my idea
 * reaching people, and is it converting interest into hands?" No public
 * ranking, no comparison to other people (UX_SPEC §6).
 */

type Row = {
  id: string;
  title: string;
  category: string;
  state: keyof typeof STATE_META;
  created_at: string;
  views: number;
  stars: number;
  pending: number;
  team: number;
  updates: number;
};

async function AnalyticsPage() {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) redirect("/login");

  // Two waits, not three. Four of the numbers below are about your ideas,
  // so the list of them comes first — and everything that is not about
  // them (your impact, the view counts, messages, invitations) goes out
  // beside it, instead of queueing behind a list it never reads. Your
  // impact used to wait on its own, in between.
  const [
    { data: ownRows },
    impact,
    viewCounts,
    dailyViews,
    { count: messagesSent },
    { count: brought },
    growth,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,category,state,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    computeImpact(supabase, user.id),
    supabase.rpc("idea_view_counts"),
    supabase.rpc("idea_view_daily", { p_days: 30 }),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", user.id),
    // Admins also see the site's users. The profile is the frame's own read,
    // already in flight, so this starts as soon as that answers — and for
    // everyone else it is never sent.
    currentProfile().then((p) =>
      p?.is_admin ? adminUserGrowth(supabase) : null,
    ),
  ]);
  const own = (ownRows ?? []) as {
    id: string;
    title: string;
    category: string;
    state: keyof typeof STATE_META;
    created_at: string;
  }[];
  const ids = own.map((p) => p.id);

  const [
    { data: starRows },
    { data: memberRows },
    { data: updateRows },
    { count: confirmedHelp },
  ] = await Promise.all([
    ids.length
      ? supabase.from("stars").select("project_id").in("project_id", ids)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
    ids.length
      ? supabase
          .from("memberships")
          .select("project_id,status")
          .in("project_id", ids)
      : Promise.resolve({ data: [] as { project_id: string; status: string }[] }),
    ids.length
      ? supabase
          .from("project_updates")
          .select("project_id")
          .in("project_id", ids)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
    ids.length
      ? supabase
          .from("contributions")
          .select("id", { count: "exact", head: true })
          .in("project_id", ids)
          .eq("status", "confirmed")
      : Promise.resolve({ count: 0 }),
  ]);

  const views = (viewCounts.data ?? []) as {
    project_id: string;
    views: number;
  }[];
  const daily = (dailyViews.data ?? []) as { day: string; views: number }[];
  const stars = (starRows ?? []) as { project_id: string }[];
  const members = (memberRows ?? []) as {
    project_id: string;
    status: string;
  }[];
  const updates = (updateRows ?? []) as { project_id: string }[];

  const countIn = (arr: { project_id: string }[], id: string) =>
    arr.filter((r) => r.project_id === id).length;

  const rows: Row[] = own.map((p) => ({
    ...p,
    views: views.find((v) => v.project_id === p.id)?.views ?? 0,
    stars: countIn(stars, p.id),
    pending: members.filter((m) => m.project_id === p.id && m.status === "pending")
      .length,
    team: members.filter((m) => m.project_id === p.id && m.status === "accepted")
      .length,
    updates: countIn(updates, p.id),
  }));

  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalStars = rows.reduce((s, r) => s + r.stars, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const totalTeam = rows.reduce((s, r) => s + r.team, 0);

  // 30-day chart data (zero-filled so quiet days read as quiet, not missing).
  const byDay = new Map(daily.map((d) => [d.day.slice(0, 10), d.views]));
  const days = recentDayKeys(30).map((key) => ({
    label: key,
    value: byDay.get(key) ?? 0,
  }));
  const peak = Math.max(1, ...days.map((d) => d.value));

  return (
    <>
      <main className="w-full max-w-4xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Your analytics</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          How your ideas are doing — private to you, never shown to neighbors
          and never compared with anyone else.
        </p>

        {growth ? (
          <>
            <UserGrowth data={growth} />
            <h2 className="mt-10 text-lg font-bold">Your ideas</h2>
          </>
        ) : null}

        {/* Headline numbers */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ideas shared" value={own.length} />
          <Stat
            label="Idea views"
            value={totalViews}
            hint="unique neighbors per day"
          />
          <Stat label="Stars received" value={totalStars} />
          <Stat label="Teammates" value={totalTeam} />
          <Stat label="Join requests waiting" value={totalPending} />
          <Stat label="Help confirmed" value={confirmedHelp ?? 0} />
          <Stat label="Messages sent" value={messagesSent ?? 0} />
          <Stat label="Neighbors brought" value={brought ?? 0} />
        </div>

        {/* The private impact score — the last piece of PRD §3.10. The
            formula is printed in full because a number you can't explain
            reads as a slot machine, and this one only ever moves when
            other people confirm your work. */}
        <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              Your impact score
            </h2>
            <span className="text-xs text-black/40 dark:text-white/40">
              Private — only you see this
            </span>
          </div>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">
            {impact.total}
          </p>
          {impact.confirmed === 0 ? (
            <p className="mt-2 text-sm text-black/55 dark:text-white/55">
              This number moves only when neighbors confirm your help on a
              project — nothing you can do alone changes it. Join something,
              pitch in, and it starts.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
              <li>
                🤝 {impact.confirmed} confirmed{" "}
                {impact.confirmed === 1 ? "contribution" : "contributions"} ·{" "}
                {impact.parts.base} pts
              </li>
              {impact.parts.attested > 0 ? (
                <li>
                  ✅ Attested by extra neighbors · {impact.parts.attested} pts
                </li>
              ) : null}
              {impact.parts.completed > 0 ? (
                <li>
                  🏁 On projects that reached completion ·{" "}
                  {impact.parts.completed} pts
                </li>
              ) : null}
              {impact.parts.early > 0 ? (
                <li>
                  🌱 Early help, when it mattered most · {impact.parts.early}{" "}
                  pts
                </li>
              ) : null}
            </ul>
          )}
        </section>

        {/* The funnel that matters */}
        <section className="mt-8">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            From looking to helping
          </h2>
          <p className="mb-3 text-xs text-black/45 dark:text-white/45">
            The journey each neighbor takes on your ideas. A wide gap between
            two steps is where to focus.
          </p>
          <ul className="flex flex-col gap-2 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
            <FunnelBar
              label="👁 Viewed"
              value={totalViews}
              max={totalViews}
              color="bg-sky-500"
            />
            <FunnelBar
              label="⭐ Starred"
              value={totalStars}
              max={totalViews}
              color="bg-amber-500"
            />
            <FunnelBar
              label="🤝 Asked to join"
              value={totalPending + totalTeam}
              max={totalViews}
              color="bg-violet-500"
            />
            <FunnelBar
              label="👥 On the team"
              value={totalTeam}
              max={totalViews}
              color="bg-pa-brand"
            />
            <FunnelBar
              label="🙌 Helped (confirmed)"
              value={confirmedHelp ?? 0}
              max={totalViews}
              color="bg-emerald-800"
            />
          </ul>
        </section>

        {/* 30-day views */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Views · last 30 days
          </h2>
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
            {totalViews === 0 ? (
              <p className="py-6 text-center text-sm text-black/45 dark:text-white/45">
                No views yet. Share your idea&apos;s link with a neighbor —
                your own visits don&apos;t count.
              </p>
            ) : (
              <>
                <div
                  className="flex h-28 items-end gap-[3px]"
                  role="img"
                  aria-label="Daily views over the last 30 days"
                >
                  {days.map((d) => (
                    <span
                      key={d.label}
                      title={`${d.label}: ${d.value} view${d.value === 1 ? "" : "s"}`}
                      className="flex-1 rounded-t bg-emerald-500/80 transition-colors hover:bg-pa-brand"
                      style={{
                        height: `${Math.max((d.value / peak) * 100, d.value > 0 ? 8 : 2)}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-black/40 dark:text-white/40">
                  <span>30 days ago</span>
                  <span>peak {peak}/day</span>
                  <span>today</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Per-idea breakdown */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            Idea by idea
          </h2>
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
              You haven&apos;t shared an idea yet —{" "}
              <Link href="/projects/new" className="underline">
                start your first
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-black/45 dark:border-slate-600 dark:text-white/45">
                    <th className="px-4 py-3 font-semibold">Idea</th>
                    <th className="px-3 py-3 font-semibold">👁</th>
                    <th className="px-3 py-3 font-semibold">⭐</th>
                    <th className="px-3 py-3 font-semibold">🤝</th>
                    <th className="px-3 py-3 font-semibold">👥</th>
                    <th className="px-3 py-3 font-semibold">📣</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-300 last:border-0 dark:border-slate-600"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${r.id}`}
                          className="font-medium hover:underline"
                        >
                          <span className="mr-1.5" aria-hidden>
                            {categoryMeta(r.category).emoji}
                          </span>
                          {r.title}
                        </Link>
                        <span className="mt-0.5 block text-xs text-black/40 dark:text-white/40">
                          {STATE_META[r.state]?.label ?? r.state} ·{" "}
                          {timeAgo(r.created_at)}
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{r.views}</td>
                      <td className="px-3 py-3 tabular-nums">{r.stars}</td>
                      <td
                        className={`px-3 py-3 tabular-nums ${r.pending > 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""}`}
                        title="Join requests waiting for you"
                      >
                        {r.pending}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{r.team}</td>
                      <td className="px-3 py-3 tabular-nums">{r.updates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
            👁 views · ⭐ stars · 🤝 requests waiting · 👥 teammates · 📣 updates
          </p>
        </section>
      </main>
    </>
  );
}

/**
 * The frame first, the content when it's ready.
 *
 * The shell streams at the first byte with a skeleton where the body will
 * land, and the body follows when its reads answer. The page used to hold
 * the whole document until the last query came back.
 */
export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <AnalyticsPage />
      </Suspense>
    </AppShell>
  );
}
