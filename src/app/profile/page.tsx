import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { MapShell } from "@/components/MapShell";
import { buildMyWorldPins, myMapCenter } from "@/lib/mapPins";
import { shellState } from "@/lib/shell";
import { LocationCard } from "./LocationCard";
import { BadgeMedallion } from "@/components/BadgeMedallion";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { badgesFrom, type BadgeMaterial } from "@/lib/badges";
import { reputationFrom, type ReputationRow } from "@/lib/reputation";
import {
  categoryMeta,
  initials,
  STATE_META,
  type Project,
} from "@/lib/projects";
import { DeleteAccountButton } from "./DeleteAccountButton";

export const metadata = { title: "Your profile" };

/** What profile_page() returns (migration 0069). */
type ProfileDoc = {
  profile: {
    display_name: string | null;
    created_at: string;
    bio: string | null;
    pronouns: string | null;
    show_pronouns: boolean | null;
    website: string | null;
    hometown: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    neighborhood_id: string | null;
    neighborhood: { name: string; city: string | null } | null;
  } | null;
  /** Your ideas, newest first; carries lat/lng for the map. */
  own: Project[];
  stars: { mine: string[]; counts: Record<string, number> };
  /** The projects you starred, most recently starred first. */
  faved: Project[];
  teams_joined: number;
  help_confirmed: number;
  messages_sent: number;
  brought: number;
  idea_views: { project_id: string; views: number }[];
  reputation: ReputationRow[];
  /** Events you run or are joining, earliest first. */
  events: {
    id: string;
    title: string;
    starts_at: string;
    place: string;
    project_id: string;
    project: {
      title: string;
      lat: number | null;
      lng: number | null;
      owner_id: string;
    } | null;
  }[];
  rsvps: string[];
  badges: BadgeMaterial;
};

function ProjectRow({
  p,
  stars,
  views,
}: {
  p: Project;
  stars: number;
  views?: number;
}) {
  const meta = STATE_META[p.state];
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-zinc-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            <span className="mr-1.5" aria-hidden>
              {categoryMeta(p.category).emoji}
            </span>
            {p.title}
          </span>
          {p.owner?.display_name ? (
            <span className="block truncate text-xs text-black/45 dark:text-white/45">
              by {p.owner.display_name}
            </span>
          ) : null}
        </span>
        {views != null ? (
          <span
            className="shrink-0 text-xs text-black/45 dark:text-white/45"
            title="Neighbors who viewed this (only you can see this)"
          >
            👁 {views}
          </span>
        ) : null}
        <span className="shrink-0 text-xs text-black/45 dark:text-white/45">
          ⭐ {stars}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          {meta.label}
        </span>
      </Link>
    </li>
  );
}

async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) redirect("/login");

  // Everything this page shows, in one request (migration 0069), beside the
  // frame's own read. It used to be about thirteen requests in two waves —
  // the second waiting on the first for your starred ids — and every one a
  // separate draw from the database's slow tail.
  const [{ data: doc, error: docError }, shell] = await Promise.all([
    supabase.rpc("profile_page"),
    // Your communities, location and their centres — loaded for the frame.
    shellState(),
  ]);
  // Rendered anyway, a failed read would be a profile with no ideas, no
  // stars and no badges, which reads as lost data. The error boundary says
  // what actually happened and offers a retry.
  if (docError || !doc) {
    throw new Error(`profile_page failed: ${docError?.message ?? "no data"}`);
  }
  const page = doc as ProfileDoc;

  const profile = page.profile;
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Neighbor";
  const own = page.own;
  const starCount = (id: string) => page.stars.counts?.[id] ?? 0;

  // Projects this user starred = their Faves.
  const myStarredIds = page.stars.mine ?? [];
  const faves = page.faved;

  // Your own point, already loaded for the frame (migration 0057). The map
  // below is built entirely from lists this page holds — location,
  // communities, your projects, your faves, your events — rather than
  // fetching each of them a second time, which is what it used to do.
  const myLoc = shell?.location ?? null;

  const viewRows = page.idea_views;
  const ideaViews = viewRows.reduce((sum, r) => sum + r.views, 0);
  const viewsFor = (id: string) =>
    viewRows.find((r) => r.project_id === id)?.views ?? 0;

  // Both derived from confirmed records at read time; the rules live in
  // lib/reputation.ts and lib/badges.ts, the inputs arrived above.
  const reputation = reputationFrom(page.reputation);
  const badges = badgesFrom(
    page.badges,
    user.id,
    profile?.neighborhood?.name ?? null,
  );

  // Straight from the frame's one read — name, city, kind and centre, which
  // since migration 0064 is everything this page wanted from a query of its
  // own.
  const myCommunities = shell?.communities ?? [];

  // Events you run or are joining — the only ones the function returns.
  const myEvents = page.events;
  const rsvpSet = new Set(page.rsvps);

  // The map, assembled from what is already on this page.
  const pins = buildMyWorldPins({
    userId: user.id,
    location: myLoc,
    communities: myCommunities,
    ownProjects: own,
    favedProjects: faves,
    events: myEvents,
    rsvpEventIds: rsvpSet,
  });

  const starsReceived = own.reduce((sum, p) => sum + starCount(p.id), 0);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;
  const hood = profile?.neighborhood
    ? profile.neighborhood.city
      ? `${profile.neighborhood.name} (${profile.neighborhood.city})`
      : profile.neighborhood.name
    : null;

  const starsGiven = myStarredIds.length;
  const dashboard = [
    { label: "Ideas shared", value: own.length },
    { label: "Idea views", value: ideaViews },
    { label: "Stars received", value: starsReceived },
    { label: "Stars given", value: starsGiven },
    { label: "Teams joined", value: page.teams_joined },
    { label: "Help confirmed", value: page.help_confirmed },
    { label: "Messages sent", value: page.messages_sent },
    { label: "Neighbors brought", value: page.brought },
  ];

  return (
    <>
      <BadgeCelebration badges={badges} userId={user.id} />
      <MapShell pins={pins}>
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          {/* Profile header */}
          <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900">
            <div
              className="h-28 bg-gradient-to-r from-emerald-100 via-sky-100 to-violet-100 bg-cover bg-center dark:from-emerald-950 dark:via-sky-950 dark:to-violet-950"
              style={
                profile?.cover_url
                  ? { backgroundImage: `url(${profile.cover_url})` }
                  : undefined
              }
            />
            <div className="px-6 pb-6">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, unoptimized is fine
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="-mt-8 h-20 w-20 rounded-full border-4 border-white object-cover dark:border-zinc-900"
                />
              ) : (
                <div className="-mt-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-2xl font-semibold text-emerald-800 dark:border-zinc-900 dark:bg-emerald-900 dark:text-emerald-200">
                  {initials(name)}
                </div>
              )}
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
                {name}
                {profile?.show_pronouns && profile?.pronouns ? (
                  <span className="ml-2 text-sm font-normal text-black/50 dark:text-white/50">
                    ({profile.pronouns})
                  </span>
                ) : null}
              </h1>
              {profile?.bio ? (
                <p className="mt-1.5 text-sm leading-relaxed text-black/70 dark:text-white/70">
                  {profile.bio}
                </p>
              ) : null}
              <div className="mt-1.5 flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
                {profile?.hometown ? <p>🏡 Hometown: {profile.hometown}</p> : null}
                {hood ? <p>📍 {hood}</p> : null}
                {memberSince ? <p>🌱 Member since {memberSince}</p> : null}
                {profile?.website ? (
                  <p>
                    🔗{" "}
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-black/80 dark:hover:text-white/80"
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/settings"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-white/80"
                >
                  Edit profile
                </Link>
                <Link
                  href="/projects/new"
                  className="rounded-lg border border-slate-400 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                >
                  Share an idea
                </Link>
              </div>
            </div>
          </section>

          {error ? (
            <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {/* Badges — evidence of acknowledged help, never bait */}
          <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium">Badges</h2>
              <span className="text-xs text-black/40 dark:text-white/40">
                Earned, never bought
              </span>
            </div>
            {badges.length > 0 ? (
              <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4">
                {badges.map((b) => (
                  <li
                    key={b.key}
                    className="flex flex-col items-center text-center"
                    title={b.fact}
                  >
                    <BadgeMedallion badge={b} />
                    <p className="mt-2 text-xs font-medium leading-tight">
                      {b.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-black/45 dark:text-white/45">
                      {b.fact}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-black/50 dark:text-white/50">
                Badges appear as your acknowledged help accumulates — a
                confirmed contribution, an attested event, a neighborhood you
                helped found. They certify what actually happened; nothing here
                can be farmed or bought.
              </p>
            )}
          </section>

          {/* Reputation — assembled from confirmed work, never declared */}
          {reputation.confirmed > 0 ? (
            <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium">What neighbors trust you with</h2>
                <span className="text-xs text-black/40 dark:text-white/40">
                  Confirmed by others
                </span>
              </div>
              {reputation.summary ? (
                <p className="mt-1.5 text-sm text-black/70 dark:text-white/70">
                  {reputation.summary}
                </p>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-2">
                {reputation.skills.map((sk) => (
                  <li
                    key={sk.type}
                    title={`${sk.count} confirmed · ${sk.attesters} neighbor${sk.attesters === 1 ? "" : "s"} attested`}
                    className="rounded-full border border-emerald-600/25 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    {sk.emoji} {sk.label} · {sk.count}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                Skills here are earned, not claimed — each one is work a
                neighbor confirmed happened.
              </p>
            </section>
          ) : null}

          <LocationCard
            initial={myLoc}
            center={await myMapCenter(supabase, user.id)}
          />

          {/* Your communities */}
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Your communities · {myCommunities.length}
              </h2>
              <Link
                href="/neighborhood"
                className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
              >
                Manage
              </Link>
            </div>
            {myCommunities.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {myCommunities.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm shadow-sm dark:border-slate-600 dark:bg-zinc-900"
                  >
                    {c.kind && c.kind !== "neighborhood" ? "👥" : "🏘️"} {c.name}
                    {c.city ? (
                      <span className="text-black/40 dark:text-white/40">
                        {" "}
                        · {c.city}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                You haven&apos;t joined a community yet —{" "}
                <Link href="/neighborhood" className="underline">
                  find yours
                </Link>
                .
              </p>
            )}
          </section>

          {/* Your events */}
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Your events · {myEvents.length}
              </h2>
              <Link
                href="/events"
                className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
              >
                All events
              </Link>
            </div>
            {myEvents.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {myEvents.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/projects/${e.project_id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <span>
                        📅 <span className="font-medium">{e.title}</span>{" "}
                        <span className="text-black/45 dark:text-white/45">
                          · {e.project?.title ?? ""}
                        </span>
                      </span>
                      <span className="text-xs text-black/45 dark:text-white/45">
                        {e.project?.owner_id === user.id
                          ? "Yours"
                          : "You’re in"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                No events yet — say &quot;I&apos;m in&quot; to one and it shows
                up here.
              </p>
            )}
          </section>

          {/* Dashboard — private stats */}
          <section className="mt-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium">Dashboard</h2>
              <Link
                href="/analytics"
                className="text-xs text-black/45 underline underline-offset-2 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
              >
                Full analytics →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {dashboard.map((d) => (
                <div
                  key={d.label}
                  className="rounded-xl bg-stone-50 p-3 text-center dark:bg-zinc-800"
                >
                  <p className="text-2xl font-semibold">{d.value}</p>
                  <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                    {d.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Faves */}
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Faves · {faves.length}
              </h2>
              <Link
                href="/faves"
                className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
              >
                See all Local Faves
              </Link>
            </div>
            {faves.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {faves.map((p) => (
                  <ProjectRow key={p.id} p={p} stars={starCount(p.id)} />
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                Projects you star show up here.
              </p>
            )}
          </section>

          {/* Groups */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              Groups
            </h2>
            <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-600 dark:bg-zinc-900">
              <p className="font-medium">No groups yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-black/60 dark:text-white/60">
                Gardening club? Pickup football? Groups are coming soon — until
                then, every project has a team.
              </p>
              <Link
                href="/people#groups"
                className="mt-4 inline-block rounded-lg border border-slate-400 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
              >
                👥 Explore groups
              </Link>
            </div>
          </section>

          {/* Ideas (posts) */}
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Ideas · {own.length}
              </h2>
              <Link
                href="/ideas"
                className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
              >
                See all
              </Link>
            </div>
            {own.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {own.map((p) => (
                  <ProjectRow
                    key={p.id}
                    p={p}
                    stars={starCount(p.id)}
                    views={viewsFor(p.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                You haven&apos;t shared an idea yet —{" "}
                <Link href="/projects/new" className="underline">
                  start your first
                </Link>
                .
              </p>
            )}
          </section>

          {/* Your data — the other half of the delete button's promise:
              you can take it as well as destroy it. */}
          <section className="mt-10 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold">Your data</h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Everything you&apos;ve written here — projects, posts, offers,
              messages, and the record of what you built with neighbors — in
              one file, whenever you want it.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <a
                href="/api/export-my-data"
                className="rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
              >
                Download my data
              </a>
              <Link
                href="/privacy"
                className="text-sm text-black/55 underline underline-offset-2 hover:text-black dark:text-white/55 dark:hover:text-white"
              >
                What we store, and what we don&apos;t
              </Link>
            </div>
          </section>

          {/* Danger zone */}
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/40 p-5 dark:border-red-900/50 dark:bg-red-950/20">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Danger zone
            </h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Deleting your account removes everything you&apos;ve created,
              permanently.
            </p>
            <div className="mt-3">
              <DeleteAccountButton />
            </div>
          </section>
        </main>
      </MapShell>
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
export default function Page(props: Parameters<typeof ProfilePage>[0]) {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <ProfilePage {...props} />
      </Suspense>
    </AppShell>
  );
}
