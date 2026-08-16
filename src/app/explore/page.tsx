import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyLinkButton } from "@/app/invite/CopyLinkButton";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { computeBadges } from "@/lib/badges";
import { communityMilestone } from "@/lib/milestones";
import { openAsks, formatMinutes } from "@/lib/asks";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { type MapPin } from "@/components/NeighborhoodMap";
import { MapShell } from "@/components/MapShell";
import { FeedComposer } from "@/components/FeedComposer";
import {
  HELP_META,
  REACH_META,
  STATE_META,
  CATEGORIES,
  CATEGORY_META,
  categoryMeta,
  categoryTint,
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

type CardData = Project & {
  starCount: number;
  team: string[]; // owner first, then accepted collaborators
  beat: string | null; // the freshest human moment on this project
  hot: boolean; // has an event in the next 7 days
};

function Avatars({ names }: { names: string[] }) {
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {names.slice(0, 4).map((n, i) => (
        <span
          key={`${n}-${i}`}
          title={n}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-[9px] font-semibold text-emerald-800 dark:border-zinc-900 dark:bg-emerald-900 dark:text-emerald-200"
        >
          {initials(n)}
        </span>
      ))}
      {names.length > 4 ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black/10 text-[9px] font-semibold dark:border-zinc-900 dark:bg-white/15">
          +{names.length - 4}
        </span>
      ) : null}
    </span>
  );
}

function ProjectCard({ p }: { p: CardData }) {
  const meta = STATE_META[p.state];
  const cat = categoryMeta(p.category);
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className={`block overflow-hidden rounded-2xl border border-slate-300 border-l-4 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/10 dark:border-slate-600 dark:bg-zinc-900 ${categoryTint(p.category)}`}
      >
        {p.photo_url ? (
          <div
            aria-hidden
            className="h-40 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${p.photo_url})` }}
          />
        ) : null}
        <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-snug">
            <span className="mr-1.5" aria-hidden>
              {cat.emoji}
            </span>
            {p.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>

        {p.beat ? (
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {p.beat}
          </p>
        ) : p.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-black/60 dark:text-white/60">
            {p.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-black/45 dark:text-white/45">
          <Avatars names={p.team} />
          <span>
            {p.team[0]}
            {p.team.length > 1 ? ` + ${p.team.length - 1}` : ""}
          </span>
          <span title="People who'd love this to exist">⭐ {p.starCount}</span>
          {p.help !== "local" ? (
            <span title={HELP_META[p.help].hint}>
              {HELP_META[p.help].emoji} {HELP_META[p.help].label}
            </span>
          ) : null}
          {p.reach !== "neighborhood" ? (
            <span title={REACH_META[p.reach].hint}>
              {REACH_META[p.reach].emoji} {REACH_META[p.reach].label}
            </span>
          ) : null}
        </div>
        </div>
      </Link>
    </li>
  );
}

function CompactRow({ p }: { p: CardData }) {
  const cat = categoryMeta(p.category);
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <span className="min-w-0 truncate text-sm">
          <span className="mr-1" aria-hidden>
            {cat.emoji}
          </span>
          <span className="font-medium">{p.title}</span>{" "}
          <span className="text-black/40 dark:text-white/40">
            · {p.beat ?? `${STATE_META[p.state].label.toLowerCase()}, ${timeAgo(p.created_at)}`}
          </span>
        </span>
        <span className="shrink-0 text-xs text-black/45 dark:text-white/45">
          {HELP_META[p.help].emoji} · ⭐ {p.starCount}
        </span>
      </Link>
    </li>
  );
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; help?: string; ev?: string }>;
}) {
  const { q, cat, help: helpFilter, ev } = await searchParams;
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
    { count: neighborCount },
    membershipResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,owner_id,title,description,category,state,help,reach,photo_url,when_text,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name),neighborhood:neighborhoods(name,city)",
      )
      .neq("state", "archived")
      .order("created_at", { ascending: false }),
    supabase.from("stars").select("project_id,created_at"),
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
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", myHood),
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

  // Founding neighbors: the first 10 members of a location, by join order —
  // a permanent, derived fact (no points, no gaming surface).
  const [
    { data: hoodMemberRows },
    { count: broughtCount },
    { count: myStarsGiven },
    { count: myRsvpCount },
  ] = await Promise.all([
    supabase
      .from("community_members")
      .select("user_id,created_at")
      .eq("community_id", myHood)
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", user.id),
    supabase
      .from("stars")
      .select("project_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("rsvps")
      .select("event_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  const foundingMembers = hoodMemberRows ?? [];
  const myFoundingRank =
    foundingMembers.findIndex((m) => m.user_id === user.id) + 1; // 0 = not founding
  const hoodSize = neighborCount ?? foundingMembers.length;
  const isFoundingEra = hoodSize < 10;

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

    return { ...p, starCount: myStars.length, team, beat, hot };
  });

  // Community counters for the page title: (city/yours/all) in your hood.
  const hoodAll = cards.filter((p) => p.neighborhood_id === myHood);
  const hoodTotal = hoodAll.length;
  const hoodMine = hoodAll.filter((p) => p.owner_id === user.id).length;

  // Top-bar search: a simple contains-match over title and description.
  const query = q?.trim().toLowerCase() ?? "";
  const searched = query
    ? cards.filter((p) =>
        `${p.title} ${p.description ?? ""}`.toLowerCase().includes(query),
      )
    : cards;

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
  const filtersActive = Boolean(cat || helpFilter || ev);

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
  const anywhere = visible.filter(
    (p) => !local.includes(p) && !city.includes(p),
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
                Explore{" "}
                <span className="font-normal text-black/50 dark:text-white/50">
                  ({myCity ?? neighborhoodName}/{hoodMine}/{hoodTotal})
                </span>
              </h1>
              <Link
                href="/neighborhood"
                className="mt-1 inline-block text-xs text-black/40 underline decoration-black/20 underline-offset-2 hover:decoration-current dark:text-white/40 dark:decoration-white/20"
              >
                Change
              </Link>
            </div>

            <FeedComposer />

            {/* Founding era: the first 10 neighbors of a location are its
                founding neighbors, permanently — real scarcity, no points. */}
            {isFoundingEra ? (
              <div className="mb-6 rounded-2xl border border-emerald-600/25 bg-gradient-to-br from-emerald-50 to-amber-50/60 p-5 shadow-sm dark:border-emerald-500/25 dark:from-emerald-950/40 dark:to-amber-950/20">
                <p className="font-medium">
                  🌱 {neighborhoodName} is just getting started
                </p>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  {myFoundingRank > 0 ? (
                    <>
                      You&apos;re <strong>Founding Neighbor #{myFoundingRank}</strong> —
                      that&apos;s permanent, and only the first 10 ever get it.{" "}
                    </>
                  ) : null}
                  {hoodSize} of 10 founding spots taken.
                  {broughtCount && broughtCount > 0 ? (
                    <>
                      {" "}
                      You&apos;ve brought{" "}
                      <strong>
                        {broughtCount} {broughtCount === 1 ? "neighbor" : "neighbors"}
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

            {query ? (
              <p className="mb-5 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-4 py-2.5 text-sm dark:border-emerald-500/25 dark:bg-emerald-950/20">
                {visible.length}{" "}
                {visible.length === 1 ? "project matches" : "projects match"}{" "}
                <span className="font-medium">“{q}”</span> ·{" "}
                <Link href="/explore" className="underline">
                  Clear search
                </Link>
              </p>
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

            {/* Filter chips — server-rendered links, shareable URLs */}
            <div className="mb-6 flex flex-wrap items-center gap-1.5">
              <Link
                href={filterHref({ cat: undefined, help: undefined, ev: undefined })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  !filtersActive
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-400 bg-white text-black/60 hover:bg-black/5 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60"
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
                      : "border-slate-400 bg-white text-black/60 hover:bg-black/5 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60"
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
                    : "border-slate-400 bg-white text-black/60 hover:bg-black/5 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60"
                }`}
              >
                🏠 Hands nearby
              </Link>
              <Link
                href={filterHref({ help: helpFilter === "remote" ? undefined : "remote" })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  helpFilter === "remote"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-400 bg-white text-black/60 hover:bg-black/5 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60"
                }`}
              >
                💻 Online help
              </Link>
              <Link
                href={filterHref({ ev: ev === "soon" ? undefined : "soon" })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  ev === "soon"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-400 bg-white text-black/60 hover:bg-black/5 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60"
                }`}
              >
                📅 Event soon
              </Link>
            </div>

            {cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-400 bg-white p-10 text-center dark:border-slate-500 dark:bg-zinc-900">
                <p className="text-3xl" aria-hidden>
                  🌱
                </p>
                <p className="mt-3 font-medium">Nothing here yet</p>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Got an idea for your neighborhood? Big or small, this is the
                  place to share it.
                </p>
                <Link
                  href="/projects/new"
                  className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Share your idea
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <section>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                    In your communities
                  </h2>
                  {local.length > 0 ? (
                    <ul className="flex flex-col gap-3">
                      {local.map((p) => (
                        <ProjectCard key={p.id} p={p} />
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-black/60 dark:border-slate-500 dark:bg-zinc-900 dark:text-white/60">
                      Nothing in your communities yet —{" "}
                      <Link href="/projects/new" className="underline">
                        yours could be the first
                      </Link>
                      .
                    </p>
                  )}
                </section>

                {city.length > 0 ? (
                  <section>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                      Around {myCity ?? "your city"}
                    </h2>
                    <ul className="flex flex-col gap-3">
                      {city.map((p) => (
                        <ProjectCard key={p.id} p={p} />
                      ))}
                    </ul>
                  </section>
                ) : null}

                {anywhere.length > 0 ? (
                  <section>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                      🌍 From anywhere
                    </h2>
                    <ul className="flex flex-col gap-2">
                      {anywhere.map((p) => (
                        <CompactRow key={p.id} p={p} />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
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
