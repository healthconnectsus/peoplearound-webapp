import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { computeBadges } from "@/lib/badges";
import { communityMilestone } from "@/lib/milestones";
import { openAsks, formatMinutes } from "@/lib/asks";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { type MapPin } from "@/components/NeighborhoodMap";
import { MapShell } from "@/components/MapShell";
import { ProjectCard, type CardData } from "@/components/ProjectFeedCard";
import { NewCommunityDialog } from "@/app/people/NewCommunityDialog";
import { kindMeta } from "@/lib/communities";
import { chip } from "@/lib/chips";
import {
  joinCommunity,
  leaveCommunity,
} from "@/app/neighborhood/communityActions";
import {
  STATE_META,
  categoryMeta,
  formatEventTime,
  initials,
  isUpcomingEvent,
  isWithinDays,
  isoDaysAgo,
  timeAgo,
  type Project,
  type ProjectEvent,
} from "@/lib/projects";
import { versionLabel } from "@/lib/version";

/**
 * Explore — "what's interesting," your communities then your city then the
 * wide world. Reached from the rail (the E) or the "Change" links elsewhere;
 * the front door at peoplearound.com is now People around (src/app/page.tsx
 * owns first-contact onboarding — invite attribution, silent neighborhood
 * claim, frontier registration — then redirects here or to /people).
 */

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    help?: string;
    ev?: string;
    kind?: string;
  }>;
}) {
  const { q, cat, help: helpFilter, ev, kind } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "neighborhood_id,created_at,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name,city)",
    )
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as unknown as {
    neighborhood_id: string | null;
    created_at: string;
    neighborhood?: { name: string; city: string | null } | null;
  } | null;

  // First-contact onboarding (invite attribution, silent neighborhood claim,
  // frontier registration) lives on the root page — it's the one place every
  // signed-in visit passes through. Landing here without a neighborhood yet
  // means that hasn't happened; send them through the same fallback every
  // other page uses.
  if (!profile?.neighborhood_id) redirect("/neighborhood");

  const myHood = profile.neighborhood_id;
  const myCity = profile.neighborhood?.city ?? null;
  const neighborhoodName = profile.neighborhood?.name ?? "your neighborhood";

  const monthAgo = isoDaysAgo(30);

  const [
    { data: projectRows },
    { data: starRows },
    { data: memberRows },
    { data: eventRows },
    { data: confirmedRows },
    membershipResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,owner_id,title,description,category,state,help,reach,photo_url,when_text,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name,avatar_url),neighborhood:neighborhoods(name,city)",
      )
      .neq("state", "archived")
      .order("created_at", { ascending: false }),
    supabase.from("stars").select("project_id,created_at,user_id"),
    supabase
      .from("memberships")
      .select("project_id,status,created_at,profile:profiles(display_name)")
      .eq("status", "accepted"),
    supabase
      .from("events")
      .select(
        "id,project_id,title,starts_at,place,created_at,rsvps(user_id),project:projects(title)",
      )
      .order("starts_at", { ascending: true })
      .limit(30),
    supabase
      .from("contributions")
      .select("project_id,confirmed_at,contributor:profiles(display_name)")
      .eq("status", "confirmed")
      .gte("confirmed_at", monthAgo),
    supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id),
  ]);

  // Communities I belong to; falls back to just the primary neighborhood
  // before migration 0011 (community_members doesn't exist yet).
  const myCommunityIds = new Set<string>(
    membershipResult.error || !membershipResult.data?.length
      ? [myHood]
      : membershipResult.data.map((m) => m.community_id),
  );

  const [{ count: myStarsGiven }, { count: myRsvpCount }] = await Promise.all([
    supabase
      .from("stars")
      .select("project_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("rsvps")
      .select("event_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  // A collective beat when the neighborhood crosses a threshold — about the
  // place, never a person (see lib/milestones.ts).
  const milestone = await communityMilestone(supabase, myHood, neighborhoodName);

  // Small help is time-sensitive in a way ideas aren't — an ask for Saturday
  // is worthless on Sunday, so it rides at the top of the feed, not on a
  // page you have to think to visit.
  const asks = await openAsks(supabase, 4);

  // Onboarding nudge: one small first action beats a blank profile. Shown
  // only to young accounts that haven't starred or RSVPed yet; it retires
  // itself the moment both are done (recognition follows, never nags).
  const starredOnce = (myStarsGiven ?? 0) > 0;
  const rsvpedOnce = (myRsvpCount ?? 0) > 0;
  const showNudge =
    profile?.created_at != null &&
    isWithinDays(profile.created_at, 30) &&
    (!starredOnce || !rsvpedOnce);

  // The directory. Explore is about finding a community to belong to, so it
  // loads all of them plus the two numbers that say whether a community is
  // alive: how many people are in it, and how much is being built there.
  const [{ data: allCommunityRows }, { data: allMemberRows }] =
    await Promise.all([
      supabase
        .from("neighborhoods")
        .select("id,name,city,kind,description")
        .order("name", { ascending: true }),
      supabase.from("community_members").select("community_id"),
    ]);

  // Membership comes from the query above — myCommunityIds already knows
  // which of these you're in.
  const memberTally = new Map<string, number>();
  for (const m of (allMemberRows ?? []) as { community_id: string }[]) {
    memberTally.set(m.community_id, (memberTally.get(m.community_id) ?? 0) + 1);
  }

  // Badges here too, so a fresh badge (e.g. 🌱 on first login after
  // founding a place) celebrates immediately — not only on the profile page.
  const badges = await computeBadges(supabase, user.id, {
    id: myHood,
    name: neighborhoodName,
  });

  const projects = (projectRows ?? []) as unknown as Project[];
  const events = ((eventRows ?? []) as unknown as ProjectEvent[]).filter((e) =>
    isUpcomingEvent(e.starts_at),
  );
  const confirmed = (confirmedRows ?? []) as unknown as {
    project_id: string;
    confirmed_at: string;
    contributor?: { display_name: string | null } | null;
  }[];
  type MemberRow = {
    project_id: string;
    created_at: string;
    profile?: { display_name: string | null } | null;
  };
  const members = (memberRows ?? []) as unknown as MemberRow[];
  const stars = starRows ?? [];

  // Assemble card data: counts, team names, and the freshest story beat.
  const cards: CardData[] = projects.map((p) => {
    const myStars = stars.filter((s) => s.project_id === p.id);
    const myMembers = members.filter((m) => m.project_id === p.id);
    const team = [
      p.owner?.display_name ?? "Someone",
      ...myMembers.map((m) => m.profile?.display_name ?? "A neighbor"),
    ];
    const nextEvent = events.find((e) => e.project_id === p.id);
    const hot = Boolean(
      nextEvent &&
        new Date(nextEvent.starts_at).getTime() <
          new Date(isoDaysAgo(-7)).getTime(),
    );

    let beat: string | null = null;
    const freshConfirmed = confirmed.find(
      (c) => c.project_id === p.id && isWithinDays(c.confirmed_at, 7),
    );
    const recentStars = myStars.filter((s) => isWithinDays(s.created_at, 7));
    const freshMember = myMembers.find((m) => isWithinDays(m.created_at, 7));
    if (nextEvent) {
      beat = `📅 ${nextEvent.title} · ${formatEventTime(nextEvent.starts_at)} · ${nextEvent.rsvps.length} going`;
    } else if (freshConfirmed) {
      beat = `🙌 ${freshConfirmed.contributor?.display_name ?? "A neighbor"}'s help was confirmed ${timeAgo(freshConfirmed.confirmed_at)}`;
    } else if (recentStars.length > 0) {
      beat = `⭐ ${recentStars.length} ${recentStars.length === 1 ? "neighbor" : "neighbors"} starred this this week`;
    } else if (freshMember) {
      beat = `🤝 ${freshMember.profile?.display_name ?? "A neighbor"} joined the team ${timeAgo(freshMember.created_at)}`;
    } else if (isWithinDays(p.created_at, 7)) {
      beat = `✨ Fresh — shared ${timeAgo(p.created_at)}`;
    }

    return {
      ...p,
      starCount: myStars.length,
      starred: myStars.some(
        (x) => (x as { user_id?: string }).user_id === user.id,
      ),
      team,
      beat,
      hot,
    };
  });

  // Top-bar search: a simple contains-match over title and description.
  const query = q?.trim().toLowerCase() ?? "";

  // One row per community: its numbers, a glimpse of what's happening inside,
  // and whether you're already in. Filtered by kind and by the search box —
  // a community you can't find is a community you can't join.
  type DirectoryRow = {
    id: string;
    name: string;
    city: string | null;
    kind: string | null;
    description: string | null;
    members: number;
    projects: number;
    glimpse: string[];
    joined: boolean;
  };
  const directory: DirectoryRow[] = (
    (allCommunityRows ?? []) as unknown as {
      id: string;
      name: string;
      city: string | null;
      kind: string | null;
      description: string | null;
    }[]
  )
    .map((c) => {
      const inHere = cards.filter((pr) => pr.neighborhood_id === c.id);
      return {
        ...c,
        members: memberTally.get(c.id) ?? 0,
        projects: inHere.length,
        glimpse: inHere.slice(0, 2).map((pr) => pr.title),
        joined: myCommunityIds.has(c.id),
      };
    })
    .filter((c) => (kind ? (c.kind ?? "other") === kind : true))
    .filter((c) =>
      query
        ? `${c.name} ${c.city ?? ""} ${c.description ?? ""}`
            .toLowerCase()
            .includes(query)
        : true,
    )
    // Busiest first — sorted alphabetically, the places worth joining hide
    // behind whatever happens to start with "A".
    .sort(
      (a, b) =>
        b.projects - a.projects ||
        b.members - a.members ||
        a.name.localeCompare(b.name),
    );

  /** Kinds that actually exist here, so the filter never offers an empty set. */
  const kindsPresent = Array.from(
    new Set(
      ((allCommunityRows ?? []) as unknown as { kind: string | null }[]).map(
        (c) => c.kind ?? "other",
      ),
    ),
  );


  const searched = query
    ? cards.filter((p) =>
        `${p.title} ${p.description ?? ""}`.toLowerCase().includes(query),
      )
    : cards;

  // The placeholder promises people, events, offers AND projects — so a
  // search returns all four, not just a quieter project list. Events are
  // already loaded; offers/asks and neighbors are two extra scoped reads
  // that only run when there's a query. RLS scopes each to what this user
  // could see anyway.
  const matchedEvents = query
    ? events.filter((e) =>
        `${e.title} ${e.place ?? ""} ${e.project?.title ?? ""}`
          .toLowerCase()
          .includes(query),
      )
    : [];
  let matchedOffers: {
    id: string;
    kind: string;
    title: string;
    claimed_by: string | null;
  }[] = [];
  let matchedPeople: { id: string; display_name: string | null }[] = [];
  if (query) {
    const [{ data: offerRows }, { data: peopleRows }] = await Promise.all([
      supabase
        .from("offers")
        .select("id,kind,title,claimed_by")
        .ilike("title", `%${query.replace(/[%_]/g, "")}%`)
        .is("claimed_by", null)
        .limit(6),
      supabase
        .from("profiles")
        .select("id,display_name")
        .eq("neighborhood_id", myHood)
        .ilike("display_name", `%${query.replace(/[%_]/g, "")}%`)
        .neq("id", user.id)
        .limit(6),
    ]);
    matchedOffers = (offerRows ?? []) as typeof matchedOffers;
    matchedPeople = (peopleRows ?? []) as typeof matchedPeople;
  }

  // Filter chips (server-rendered, shareable URLs): category, help kind,
  // and "has an event soon".
  const projectsWithSoonEvent = new Set(events.map((e) => e.project_id));
  const visible = searched.filter(
    (p) =>
      (!cat || p.category === cat) &&
      (!helpFilter || p.help === helpFilter || p.help === "both") &&
      (ev !== "soon" || projectsWithSoonEvent.has(p.id)),
  );
  const filterHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, cat, help: helpFilter, ev, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  // Zones: your communities first, then your city, then the wide world.
  const local = visible.filter(
    (p) => p.neighborhood_id != null && myCommunityIds.has(p.neighborhood_id),
  );
  const city = visible.filter(
    (p) =>
      (p.neighborhood_id == null || !myCommunityIds.has(p.neighborhood_id)) &&
      myCity != null &&
      p.neighborhood?.city === myCity,
  );

  // Map pins for every visible, located project.
  // The map is "what's being built AROUND YOU": pin the local + city
  // projects. Global ideas live in the "From anywhere" list — pinning them
  // would zoom the map out to the whole continent, which shows nothing.
  const nearby = [...local, ...city];
  const mappable = nearby.some((p) => p.lat != null && p.lng != null)
    ? nearby
    : visible;
  const pins: MapPin[] = mappable
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      title: p.title,
      emoji: categoryMeta(p.category).emoji,
      href: `/projects/${p.id}`,
      lat: p.lat!,
      lng: p.lng!,
      subtitle: p.beat ?? `${STATE_META[p.state].label} · ${p.team[0]}`,
      hot: p.hot,
    }));

  return (
    <AppShell>
      <BadgeCelebration badges={badges} userId={user.id} />
      <LiveRefresh tables="projects,events" />

      <MapShell pins={pins}>
        <main className="min-w-0">
          <div className="w-full max-w-3xl p-4 lg:py-6 lg:pl-36 lg:pr-8">
            <div className="mb-5">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Explore communities{" "}
                <span className="font-normal text-black/50 dark:text-white/50">
                  ({directory.length})
                </span>
              </h1>
              <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                A neighborhood, a building, a hobby, a cause — join the ones
                you belong to, and see what they&rsquo;re building.
              </p>
            </div>

            {query ? (
              <p className="mb-5 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-4 py-2.5 text-sm dark:border-emerald-500/25 dark:bg-emerald-950/20">
                {visible.length +
                  matchedEvents.length +
                  matchedOffers.length +
                  matchedPeople.length}{" "}
                {visible.length +
                  matchedEvents.length +
                  matchedOffers.length +
                  matchedPeople.length ===
                1
                  ? "result matches"
                  : "results match"}{" "}
                <span className="font-medium">“{q}”</span> ·{" "}
                <Link href="/explore" className="underline">
                  Clear search
                </Link>
              </p>
            ) : null}

            {/* People, events and offers that match — compact rows above the
                project results, each linking into the surface that owns it. */}
            {matchedPeople.length > 0 ? (
              <div className="mb-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  People
                </h2>
                <ul className="flex flex-col gap-2">
                  {matchedPeople.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/chats?to=${n.id}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          {initials(n.display_name)}
                        </span>
                        <span className="font-medium">
                          {n.display_name ?? "A neighbor"}
                        </span>
                        <span className="ml-auto text-xs text-black/40 dark:text-white/40">
                          Message →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {matchedEvents.length > 0 ? (
              <div className="mb-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  Events
                </h2>
                <ul className="flex flex-col gap-2">
                  {matchedEvents.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/projects/${e.project_id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <span className="min-w-0 truncate">
                          📅 <span className="font-medium">{e.title}</span>{" "}
                          <span className="text-black/40 dark:text-white/40">
                            · {formatEventTime(e.starts_at)}
                            {e.place ? ` · ${e.place}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-black/45 dark:text-white/45">
                          🙋 {e.rsvps.length} going
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {matchedOffers.length > 0 ? (
              <div className="mb-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  Offers &amp; asks
                </h2>
                <ul className="flex flex-col gap-2">
                  {matchedOffers.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={o.kind === "need" ? "/people#asks" : "/offers"}
                        className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <span aria-hidden>{o.kind === "need" ? "🙋" : "🎁"}</span>
                        <span className="min-w-0 truncate font-medium">
                          {o.title}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-black/40 dark:text-white/40">
                          {o.kind === "need" ? "Small help" : "Offer"} →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {asks.length > 0 && !query ? (
              <div className="mb-7">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  Neighbors need a hand
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {asks.map((a) => (
                    <li key={a.id}>
                      <Link
                        href="/people#asks"
                        className="flex h-full flex-col gap-0.5 rounded-xl border border-amber-500/25 bg-amber-50/70 px-4 py-3 shadow-sm transition-colors hover:bg-amber-50 dark:border-amber-500/25 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                      >
                        <span className="text-sm font-medium">
                          🙋 {a.title}
                        </span>
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

            {events.length > 0 && !query ? (
              <div className="mb-7">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  Happening soon
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {events.slice(0, 4).map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/projects/${e.project_id}`}
                        className="flex h-full flex-col gap-0.5 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-4 py-3 shadow-sm transition-colors hover:bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                      >
                        <span className="text-sm font-medium">
                          📅 {e.title}
                        </span>
                        <span className="text-xs text-black/50 dark:text-white/50">
                          {formatEventTime(e.starts_at)}
                          {e.place ? ` · ${e.place}` : ""} · 🙋 {e.rsvps.length}{" "}
                          going
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {milestone ? (
              <div className="mb-6 rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-emerald-50/60 p-5 text-center dark:border-amber-600/30 dark:from-amber-950/30 dark:to-emerald-950/20">
                <p className="text-2xl" aria-hidden>
                  {milestone.emoji}
                </p>
                <p className="mt-1 font-semibold">{milestone.text}</p>
                <Link
                  href="/recap"
                  className="mt-1 inline-block text-xs text-black/50 underline underline-offset-2 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
                >
                  See the year so far
                </Link>
              </div>
            ) : null}

            {showNudge ? (
              <div className="mb-6 rounded-2xl border border-sky-600/20 bg-sky-50/70 p-5 dark:border-sky-500/25 dark:bg-sky-950/20">
                <p className="font-medium">👋 Two small ways to start</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  <li className={starredOnce ? "text-black/40 line-through dark:text-white/40" : "text-black/70 dark:text-white/70"}>
                    {starredOnce ? "✓" : "○"} Star an idea you&apos;d be glad
                    existed
                  </li>
                  <li className={rsvpedOnce ? "text-black/40 line-through dark:text-white/40" : "text-black/70 dark:text-white/70"}>
                    {rsvpedOnce ? "✓" : "○"} Say &quot;I&apos;m in&quot; to one
                    event
                  </li>
                </ul>
                <p className="mt-2 text-xs text-black/45 dark:text-white/45">
                  No commitment — this card disappears once you&apos;ve tried
                  both.
                </p>
              </div>
            ) : null}

            {/* Projects matching the search. Browsing is about communities
                now, but the top bar still promises projects — so a query
                answers with them, right below the other matches. */}
            {query && visible.length > 0 ? (
              <div className="mb-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  Projects
                </h2>
                <ul className="flex flex-col gap-3">
                  {visible.map((pr) => (
                    <ProjectCard key={pr.id} p={pr} returnTo="/explore" />
                  ))}
                </ul>
              </div>
            ) : null}

            {query ? (
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Communities
              </h2>
            ) : null}

            {/* Kind filter — server-rendered links, shareable URLs */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <Link
                href={filterHref({ kind: undefined })}
                className={chip(!kind)}
              >
                All
              </Link>
              {kindsPresent.map((k) => (
                <Link
                  key={k}
                  href={filterHref({ kind: kind === k ? undefined : k })}
                  className={chip(kind === k)}
                >
                  {kindMeta(k).label}
                </Link>
              ))}
            </div>

            <NewCommunityDialog />

            {directory.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-400 bg-white p-10 text-center dark:border-slate-500 dark:bg-zinc-900">
                <p className="text-3xl" aria-hidden>
                  🧭
                </p>
                <p className="mt-3 font-medium">No communities here yet</p>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  {query || kind
                    ? "Nothing matches that — try a different filter."
                    : "Start the first one and invite the people who belong in it."}
                </p>
              </div>
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {directory.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="flex flex-wrap items-center gap-2 font-medium">
                          {c.name}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${kindMeta(c.kind).badge}`}
                          >
                            {kindMeta(c.kind).label}
                          </span>
                          {c.joined ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              You&rsquo;re in
                            </span>
                          ) : null}
                        </h2>
                        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                          {c.city ? `${c.city} · ` : ""}
                          {c.members} {c.members === 1 ? "member" : "members"} ·{" "}
                          {c.projects} {c.projects === 1 ? "project" : "projects"}
                        </p>
                      </div>

                      {c.joined ? (
                        <form action={leaveCommunity} className="shrink-0">
                          <input type="hidden" name="communityId" value={c.id} />
                          <input type="hidden" name="returnTo" value="/explore" />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                          >
                            Leave
                          </button>
                        </form>
                      ) : (
                        <form action={joinCommunity} className="shrink-0">
                          <input type="hidden" name="communityId" value={c.id} />
                          <input type="hidden" name="returnTo" value="/explore" />
                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                          >
                            Join
                          </button>
                        </form>
                      )}
                    </div>

                    {c.description ? (
                      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                        {c.description}
                      </p>
                    ) : null}

                    {/* A glimpse of what is actually happening in there — the
                        difference between joining a name and joining a place. */}
                    {c.glimpse.length > 0 ? (
                      <ul className="mt-2.5 flex flex-col gap-1">
                        {c.glimpse.map((t) => (
                          <li
                            key={t}
                            className="truncate text-xs text-black/45 dark:text-white/45"
                          >
                            · {t}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2.5 text-xs italic text-black/35 dark:text-white/35">
                        Nothing being built here yet.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <footer className="py-8 text-center text-xs text-black/30 dark:text-white/30">
              {versionLabel()}
            </footer>
          </div>
        </main>
      </MapShell>
    </AppShell>
  );
}
