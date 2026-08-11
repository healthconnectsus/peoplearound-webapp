import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { AsksSection } from "@/components/AsksSection";
import { FeedComposer } from "@/components/FeedComposer";
import { ProjectCard } from "@/components/ProjectFeedCard";
import { loadFeedCards } from "@/lib/feed";
import { openAsks, formatMinutes } from "@/lib/asks";
import { groupPins, nearbyProjectPins, peopleClusterPins } from "@/lib/mapPins";
import {
  initials,
  isoDaysAgo,
  formatEventTime,
  CATEGORIES,
  CATEGORY_META,
} from "@/lib/projects";
import { KIND_META, communityLabel, kindMeta, type Community } from "@/lib/communities";
import { LocateButton } from "@/app/neighborhood/LocateButton";
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  setPrimaryCommunity,
} from "@/app/neighborhood/communityActions";

/**
 * People around — the P that opens the rail's acrostic. Explore's twin: the
 * same feed grammar (composer, asks/events highlights, filter chips, project
 * cards), but narrowed to your own communities rather than the whole city
 * and beyond. Below the feed: the neighbors near you, the communities and
 * groups they form (absorbed from the old "My Communities" rail), and the
 * small asks they bring to each other.
 */

const PILL_BTN =
  "rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";
const INPUT =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-white/20";

type PersonRow = {
  id: string;
  display_name: string | null;
  created_at: string;
};

function PersonCard({
  person,
  badge,
}: {
  person: PersonRow;
  badge?: string;
}) {
  const name = person.display_name ?? "A neighbor";
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-zinc-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        {badge ? (
          <p className="text-xs text-black/50 dark:text-white/50">{badge}</p>
        ) : null}
      </div>
      {badge !== "You" ? (
        <Link
          href={`/chats?to=${person.id}`}
          className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Message
        </Link>
      ) : null}
    </li>
  );
}

function KindBadge({ kind }: { kind: string | null | undefined }) {
  const meta = kindMeta(kind);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    compose?: string;
    cat?: string;
    help?: string;
  }>;
}) {
  const { error, message, compose, cat, help: helpFilter } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profileRow },
    { data: communityRows },
    membershipResult,
    { data: remoteProjectRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "neighborhood_id,display_name,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name)",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("neighborhoods").select("*").order("name"),
    supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id),
    // People offering skills that work from anywhere = owners of projects
    // that welcome online help.
    supabase
      .from("projects")
      .select(
        "owner_id,help,owner:profiles!projects_owner_id_fkey(id,display_name,created_at)",
      )
      .in("help", ["remote", "both"])
      .neq("state", "archived"),
  ]);

  const profile = profileRow as unknown as {
    neighborhood_id: string | null;
    display_name: string | null;
    neighborhood?: { name: string } | null;
  } | null;
  const primaryId = profile?.neighborhood_id ?? null;
  const hoodName = profile?.neighborhood?.name ?? "your neighborhood";
  const myName = profile?.display_name ?? user.email ?? null;

  const { data: neighborRows } = primaryId
    ? await supabase
        .from("profiles")
        .select("id,display_name,created_at")
        .eq("neighborhood_id", primaryId)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const neighbors = (neighborRows ?? []) as PersonRow[];
  const remoteOwners = new Map<string, PersonRow>();
  for (const row of (remoteProjectRows ?? []) as unknown as {
    owner_id: string;
    owner?: PersonRow | null;
  }[]) {
    if (row.owner && !remoteOwners.has(row.owner_id)) {
      remoteOwners.set(row.owner_id, row.owner);
    }
  }
  const remoteHelpers = [...remoteOwners.values()].filter(
    (p) => !neighbors.some((n) => n.id === p.id),
  );

  const communities = (communityRows ?? []) as Community[];
  // Pre-migration-0011 fallback: treat the primary neighborhood as the only
  // membership so the page still works.
  const migrationApplied = !membershipResult.error;
  const myIds = new Set(
    migrationApplied
      ? (membershipResult.data ?? []).map((m) => m.community_id)
      : primaryId
        ? [primaryId]
        : [],
  );
  const mine = communities.filter((c) => myIds.has(c.id));
  const discover = communities.filter((c) => !myIds.has(c.id));

  // The feed strip, narrowed to your own communities — projects.neighborhood_id
  // is the same table as community_members.community_id (0011 generalized
  // neighborhoods into communities), so this is a direct filter, not a guess.
  const communityIds = [...myIds];
  const { data: idRows } = communityIds.length
    ? await supabase
        .from("projects")
        .select("id")
        .in("neighborhood_id", communityIds)
        .neq("state", "archived")
    : { data: [] };
  const communityProjectIds = (idRows ?? []).map((r) => r.id as string);
  const { cards, events, confirmedThisMonth } = await loadFeedCards(
    supabase,
    communityProjectIds,
  );
  const asks = await openAsks(supabase, 4);

  const visible = cards.filter(
    (p) =>
      (!cat || p.category === cat) &&
      (!helpFilter || p.help === helpFilter || p.help === "both"),
  );
  const filterHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { cat, help: helpFilter, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/people?${qs}#feed` : "/people#feed";
  };
  const filtersActive = Boolean(cat || helpFilter);

  const building = cards.filter((p) => p.state === "active").length;
  const eventsThisWeek = events.filter(
    (e) => new Date(e.starts_at).getTime() < new Date(isoDaysAgo(-7)).getTime(),
  ).length;

  // People are pinned as COMMUNITY clusters with headcounts — never at
  // anyone's home (see lib/mapPins.ts). Groups live here too: a group IS
  // people.
  const [clusters, gPins] = await Promise.all([
    peopleClusterPins(supabase),
    groupPins(supabase),
  ]);
  const located = [...clusters, ...gPins];
  const pins = located.length
    ? located
    : await nearbyProjectPins(supabase, user.id);

  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-24 lg:pr-8">
          {/* Same header grammar as Explore: the place in the title, the
              numbers as pulse chips — this page is Explore's twin, focused
              on who's here rather than what's happening. */}
          <div className="mb-5">
            <h1 className="text-3xl font-extrabold tracking-tight">
              People around{" "}
              <span className="font-normal text-black/50 dark:text-white/50">
                ({hoodName})
              </span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60">
                👥 {neighbors.length} {neighbors.length === 1 ? "neighbor" : "neighbors"}
              </span>
              <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60">
                🏘 {mine.length} {mine.length === 1 ? "community" : "communities"}
              </span>
              {building > 0 ? (
                <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60">
                  🚀 {building} building
                </span>
              ) : null}
              {eventsThisWeek > 0 ? (
                <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60">
                  📅 {eventsThisWeek} {eventsThisWeek === 1 ? "event" : "events"} this week
                </span>
              ) : null}
              {confirmedThisMonth > 0 ? (
                <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60">
                  🙌 {confirmedThisMonth} confirmed this month
                </span>
              ) : null}
              {remoteHelpers.length > 0 ? (
                <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60">
                  💻 {remoteHelpers.length} helping online
                </span>
              ) : null}
            </div>
          </div>

          <FeedComposer name={myName} />

          {error ? (
            <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </p>
          ) : null}
          {!migrationApplied ? (
            <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Multi-community support needs migration 0011 — run
              supabase/migrations/0011_communities_and_chats.sql in the Supabase
              SQL editor.
            </p>
          ) : null}

          {!primaryId ? (
            <div className="mt-6 rounded-2xl border border-emerald-600/20 bg-emerald-50/70 p-5 dark:border-emerald-500/25 dark:bg-emerald-950/20">
              <h2 className="font-medium">Welcome! Where are you?</h2>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Find your neighborhood first — your location is only used once
                and never stored.
              </p>
              <div className="mt-4">
                <LocateButton />
              </div>
            </div>
          ) : null}

          <section id="feed" className="mt-6 scroll-mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              What&rsquo;s happening in your communities
            </h2>

            {asks.length > 0 ? (
              <div className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                  Neighbors need a hand
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {asks.map((a) => (
                    <li key={a.id}>
                      <Link
                        href="/people#asks"
                        className="flex h-full flex-col gap-0.5 rounded-xl border border-amber-500/25 bg-amber-50/70 px-4 py-3 shadow-sm transition-colors hover:bg-amber-50 dark:border-amber-500/25 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                      >
                        <span className="text-sm font-medium">🙋 {a.title}</span>
                        <span className="text-xs text-black/50 dark:text-white/50">
                          ⏱ {formatMinutes(a.minutes)}
                          {a.when_text ? ` · ${a.when_text}` : ""}
                          {a.asker ? ` · ${a.asker}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {events.length > 0 ? (
              <div className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                  Happening soon
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {events.slice(0, 4).map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/projects/${e.project_id}`}
                        className="flex h-full flex-col gap-0.5 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-4 py-3 shadow-sm transition-colors hover:bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                      >
                        <span className="text-sm font-medium">📅 {e.title}</span>
                        <span className="text-xs text-black/50 dark:text-white/50">
                          {formatEventTime(e.starts_at)}
                          {e.place ? ` · ${e.place}` : ""} · 🙋 {e.rsvps.length} going
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {cards.length > 0 ? (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <Link
                  href={filterHref({ cat: undefined, help: undefined })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    !filtersActive
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-black/10 bg-white text-black/60 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60"
                  }`}
                >
                  All
                </Link>
                {CATEGORIES.map((c) => (
                  <Link
                    key={c}
                    href={filterHref({ cat: cat === c ? undefined : c })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      cat === c
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-black/10 bg-white text-black/60 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60"
                    }`}
                  >
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </Link>
                ))}
                <span className="mx-1 h-4 w-px bg-black/10 dark:bg-white/15" aria-hidden />
                <Link
                  href={filterHref({ help: helpFilter === "local" ? undefined : "local" })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    helpFilter === "local"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-black/10 bg-white text-black/60 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60"
                  }`}
                >
                  🏠 Hands nearby
                </Link>
                <Link
                  href={filterHref({ help: helpFilter === "remote" ? undefined : "remote" })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    helpFilter === "remote"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-black/10 bg-white text-black/60 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60"
                  }`}
                >
                  💻 Online help
                </Link>
              </div>
            ) : null}

            {cards.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                Nothing in your communities yet —{" "}
                <Link href="/projects/new" className="underline">
                  yours could be the first
                </Link>
                .
              </p>
            ) : visible.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                Nothing matches that filter —{" "}
                <Link href="/people#feed" className="underline">
                  clear it
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </ul>
            )}
          </section>

          <section id="communities" className="mt-10 scroll-mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              🏘 My communities · {mine.length}
            </h2>
            <p className="mb-3 text-sm text-black/50 dark:text-white/50">
              Your neighborhood is just the start — join the cultural, hobby,
              and interest communities you belong to. Your primary community
              decides your home feed.
            </p>
            {mine.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {mine.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/5 dark:bg-zinc-900"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{communityLabel(c)}</span>
                        <KindBadge kind={c.kind} />
                        {c.id === primaryId ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
                            <Star className="h-3 w-3" aria-hidden /> Primary
                          </span>
                        ) : null}
                      </span>
                      {c.description ? (
                        <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
                          {c.description}
                        </span>
                      ) : null}
                    </span>
                    {c.id !== primaryId ? (
                      <span className="flex gap-2">
                        <form action={setPrimaryCommunity}>
                          <input type="hidden" name="communityId" value={c.id} />
                          <button type="submit" className={PILL_BTN}>
                            Set primary
                          </button>
                        </form>
                        <form action={leaveCommunity}>
                          <input type="hidden" name="communityId" value={c.id} />
                          <button type="submit" className={PILL_BTN}>
                            Leave
                          </button>
                        </form>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                You haven&apos;t joined any communities yet — find yours below.
              </p>
            )}

            {discover.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                  Discover
                </h3>
                <ul className="flex flex-col gap-2">
                  {discover.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/5 dark:bg-zinc-900"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{communityLabel(c)}</span>
                          <KindBadge kind={c.kind} />
                        </span>
                        {c.description ? (
                          <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
                            {c.description}
                          </span>
                        ) : null}
                      </span>
                      <form action={joinCommunity}>
                        <input type="hidden" name="communityId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                        >
                          Join
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                Start a community
              </h3>
              <form
                action={createCommunity}
                className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Chess players of Manhattan"
                    className={`${INPUT} flex-1`}
                  />
                  <select
                    name="kind"
                    className={`${INPUT} sm:w-44`}
                    defaultValue="interest"
                  >
                    {Object.entries(KIND_META).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  name="city"
                  maxLength={80}
                  placeholder="City (optional)"
                  className={INPUT}
                />
                <input
                  type="text"
                  name="description"
                  maxLength={300}
                  placeholder="One line about who this is for (optional)"
                  className={INPUT}
                />
                <button
                  type="submit"
                  className="self-start rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Create community
                </button>
              </form>
            </div>
          </section>

          {primaryId ? (
            <section className="mt-10">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                In {hoodName} · {neighbors.length}
              </h2>
              {neighbors.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {neighbors.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      badge={p.id === user.id ? "You" : undefined}
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                  No neighbors here yet —{" "}
                  <Link href="/invite" className="underline">
                    invite some
                  </Link>
                  .
                </p>
              )}
            </section>
          ) : null}

          {remoteHelpers.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                💻 Open to helping online
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {remoteHelpers.map((p) => (
                  <PersonCard key={p.id} person={p} badge="Welcomes online help" />
                ))}
              </ul>
            </section>
          ) : null}


          <AsksSection userId={user.id} startOpen={compose === "1"} />
        </main>
      </MapShell>
    </AppShell>
  );
}
