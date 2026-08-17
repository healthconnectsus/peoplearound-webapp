import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { AsksSection } from "@/components/AsksSection";
import { FeedComposer } from "@/components/FeedComposer";
import { CopyLinkButton } from "@/app/invite/CopyLinkButton";
import { CommunityFilter } from "@/components/CommunityFilter";
import { TagFilter } from "@/components/TagFilter";
import { NewCommunityDialog } from "./NewCommunityDialog";
import { ProjectCard } from "@/components/ProjectFeedCard";
import { loadFeedCards } from "@/lib/feed";
import { openAsks, formatMinutes } from "@/lib/asks";
import { groupPins, nearbyProjectPins, peopleClusterPins } from "@/lib/mapPins";
import {
  initials,
  formatEventTime,
  CATEGORIES,
  CATEGORY_META,
} from "@/lib/projects";
import { communityLabel, kindMeta, type Community } from "@/lib/communities";
import { LocateButton } from "@/app/neighborhood/LocateButton";
import {
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
  "rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10";

type PersonRow = {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
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
    <li className="flex items-center gap-3 py-2">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, unoptimized is fine
        <img
          src={person.avatar_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/10"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 ring-1 ring-black/10 dark:bg-emerald-900 dark:text-emerald-200">
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        {badge ? (
          <p className="text-xs text-black/50 dark:text-white/50">{badge}</p>
        ) : null}
      </div>
      {badge !== "You" ? (
        <Link
          href={`/chats?to=${person.id}`}
          className="shrink-0 rounded-lg border border-slate-400 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
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
    community?: string;
  }>;
}) {
  const {
    error,
    message,
    compose,
    cat,
    help: helpFilter,
    community,
  } = await searchParams;
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
        "neighborhood_id,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name)",
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
        "owner_id,help,owner:profiles!projects_owner_id_fkey(id,display_name,avatar_url,created_at)",
      )
      .in("help", ["remote", "both"])
      .neq("state", "archived"),
  ]);

  const profile = profileRow as unknown as {
    neighborhood_id: string | null;
    neighborhood?: { name: string } | null;
  } | null;
  const primaryId = profile?.neighborhood_id ?? null;

  // Founding neighbors: the first 10 members of a place, by join order — a
  // permanent, derived fact (no points, no gaming surface). It belongs on
  // this page because it is about the community that is *yours*.
  const [{ data: hoodMemberRows }, { count: neighborCount }, { count: broughtCount }] =
    primaryId
      ? await Promise.all([
          supabase
            .from("community_members")
            .select("user_id,created_at")
            .eq("community_id", primaryId)
            .order("created_at", { ascending: true })
            .limit(10),
          supabase
            .from("community_members")
            .select("user_id", { count: "exact", head: true })
            .eq("community_id", primaryId),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("invited_by", user.id),
        ])
      : [{ data: [] }, { count: 0 }, { count: 0 }];

  const foundingMembers = (hoodMemberRows ?? []) as { user_id: string }[];
  const myFoundingRank =
    foundingMembers.findIndex((m) => m.user_id === user.id) + 1; // 0 = not founding
  const hoodSize = neighborCount ?? foundingMembers.length;
  const isFoundingEra = primaryId != null && hoodSize < 10;
  const hoodName = profile?.neighborhood?.name ?? "your neighborhood";

  const { data: neighborRows } = primaryId
    ? await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,created_at")
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
  // A picked community narrows the feed further — but only one of yours;
  // an arbitrary id in the URL falls back to all, never widens.
  const picked = community && myIds.has(community) ? community : "";
  const communityIds = picked ? [picked] : [...myIds];
  const { data: idRows } = communityIds.length
    ? await supabase
        .from("projects")
        .select("id")
        .in("neighborhood_id", communityIds)
        .neq("state", "archived")
    : { data: [] };
  const communityProjectIds = (idRows ?? []).map((r) => r.id as string);
  const { cards, events } = await loadFeedCards(supabase, communityProjectIds, user.id);
  const asks = await openAsks(supabase, 4);

  // Tags are multi-select now — "games AND food & drink" is a reasonable
  // thing to want, and the old single-value chips made it impossible.
  const csv = (v: string | undefined) =>
    (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const cats = csv(cat);
  const helps = csv(helpFilter);

  const visible = cards.filter(
    (p) =>
      (cats.length === 0 || cats.includes(p.category)) &&
      (helps.length === 0 ||
        helps.includes(p.help) ||
        // "Both" answers either kind of help, so it belongs in both filters.
        p.help === "both"),
  );

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
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          <FeedComposer />

          {/* Founding era: the first 10 neighbors of a place are its founding
              neighbors, permanently — real scarcity, no points. */}
          {isFoundingEra ? (
            <div className="mb-6 rounded-2xl border border-emerald-600/25 bg-gradient-to-br from-emerald-50 to-amber-50/60 p-5 shadow-sm dark:border-emerald-500/25 dark:from-emerald-950/40 dark:to-amber-950/20">
              <p className="font-medium">
                🌱 {hoodName} is just getting started
              </p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {myFoundingRank > 0 ? (
                  <>
                    You&apos;re{" "}
                    <strong>Founding Neighbor #{myFoundingRank}</strong> —
                    that&apos;s permanent, and only the first 10 ever get it.{" "}
                  </>
                ) : null}
                {hoodSize} of 10 founding spots taken.
                {broughtCount && broughtCount > 0 ? (
                  <>
                    {" "}
                    You&apos;ve brought{" "}
                    <strong>
                      {broughtCount}{" "}
                      {broughtCount === 1 ? "neighbor" : "neighbors"}
                    </strong>{" "}
                    here already.
                  </>
                ) : (
                  " Every neighbor you bring is credited to you, permanently."
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <CopyLinkButton userId={user.id} />
                <Link
                  href="/invite"
                  className="text-sm text-black/50 underline underline-offset-2 hover:text-black dark:text-white/50 dark:hover:text-white"
                >
                  More ways to invite
                </Link>
              </div>
            </div>
          ) : null}

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
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CommunityFilter
                communities={mine.map((c) => ({
                  id: c.id,
                  label: communityLabel(c),
                }))}
                selected={picked}
              />

              {cards.length > 0 ? (
                <TagFilter
                  basePath="/people"
                  extraParams={{ community: picked || undefined }}
                  selected={{ cat: cats, help: helps }}
                  groups={[
                    {
                      param: "cat",
                      label: "Category",
                      options: CATEGORIES.map((c) => ({
                        value: c,
                        label: CATEGORY_META[c].label,
                        emoji: CATEGORY_META[c].emoji,
                      })),
                    },
                    {
                      param: "help",
                      label: "Looking for",
                      options: [
                        { value: "local", label: "Hands nearby", emoji: "🏠" },
                        { value: "remote", label: "Online help", emoji: "💻" },
                      ],
                    },
                  ]}
                />
              ) : null}
            </div>

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

            {cards.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                Nothing in your communities yet —{" "}
                <Link href="/projects/new" className="underline">
                  yours could be the first
                </Link>
                .
              </p>
            ) : visible.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                Nothing matches that filter —{" "}
                <Link href="/people#feed" className="underline">
                  clear it
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((p) => (
                  <ProjectCard key={p.id} p={p} returnTo="/people" />
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
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{communityLabel(c)}</span>
                        <KindBadge kind={c.kind} />
                        {c.id === primaryId ? (
                          <span className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
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
              <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
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
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
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
                          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                        >
                          Join
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <NewCommunityDialog />
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
                <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
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
