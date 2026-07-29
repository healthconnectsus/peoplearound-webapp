import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveRefresh } from "@/components/LiveRefresh";
import { NeighborhoodMap, type MapPin } from "@/components/NeighborhoodMap";
import {
  HELP_META,
  REACH_META,
  STATE_META,
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
        className={`block rounded-2xl border border-black/5 border-l-4 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/10 dark:border-white/5 dark:bg-zinc-900 ${categoryTint(p.category)}`}
      >
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
        className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white px-4 py-2.5 shadow-sm transition-colors hover:bg-stone-50 dark:border-white/5 dark:bg-zinc-900 dark:hover:bg-zinc-800"
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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Everything is neighborhood-scoped; picking one is the required first step.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("neighborhood_id,neighborhood:neighborhoods(name,city)")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as unknown as {
    neighborhood_id: string | null;
    neighborhood?: { name: string; city: string | null } | null;
  } | null;
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
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,owner_id,title,description,category,state,help,reach,lat,lng,neighborhood_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name),neighborhood:neighborhoods(name,city)",
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
  ]);

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

  // Zones: your streets first, then your city, then the wide world.
  const local = cards.filter((p) => p.neighborhood_id === myHood);
  const city = cards.filter(
    (p) =>
      p.neighborhood_id !== myHood &&
      myCity != null &&
      p.neighborhood?.city === myCity,
  );
  const anywhere = cards.filter((p) => !local.includes(p) && !city.includes(p));

  // The neighborhood pulse — proof of life above the fold.
  const building = local.filter((p) => p.state === "active").length;
  const eventsThisWeek = events.filter(
    (e) => new Date(e.starts_at).getTime() < new Date(isoDaysAgo(-7)).getTime(),
  ).length;
  const confirmedThisMonth = confirmed.length;
  const pulse: { emoji: string; text: string }[] = [
    neighborCount ? { emoji: "👥", text: `${neighborCount} neighbors` } : null,
    building
      ? { emoji: "🚀", text: `${building} building` }
      : null,
    eventsThisWeek
      ? { emoji: "📅", text: `${eventsThisWeek} ${eventsThisWeek === 1 ? "event" : "events"} this week` }
      : null,
    confirmedThisMonth
      ? { emoji: "🙌", text: `${confirmedThisMonth} confirmed this month` }
      : null,
  ].filter(Boolean) as { emoji: string; text: string }[];

  // Map pins for every visible, located project.
  const pins: MapPin[] = cards
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <LiveRefresh tables="projects,stars,memberships,events" />

      <div className={pins.length > 0 ? "lg:grid lg:grid-cols-[minmax(0,1fr)_44%] xl:grid-cols-[minmax(0,1fr)_46%]" : ""}>
        {/* The map — the neighborhood as a place. Sticky on desktop. */}
        {pins.length > 0 ? (
          <aside className="p-4 pb-0 lg:order-2 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:p-4">
            <NeighborhoodMap pins={pins} className="h-64 lg:h-full" />
          </aside>
        ) : null}

        <main className="min-w-0 lg:order-1">
          <div className="mx-auto w-full max-w-2xl p-4 lg:px-8 lg:py-6">
            <div className="mb-5">
              <h1 className="text-2xl font-semibold tracking-tight">
                {neighborhoodName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {pulse.map((s) => (
                  <span
                    key={s.text}
                    className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/5 dark:bg-zinc-900 dark:text-white/60"
                  >
                    {s.emoji} {s.text}
                  </span>
                ))}
                <Link
                  href="/neighborhood"
                  className="px-1 text-xs text-black/40 underline decoration-black/20 underline-offset-2 hover:decoration-current dark:text-white/40 dark:decoration-white/20"
                >
                  Change
                </Link>
              </div>
            </div>

            {events.length > 0 ? (
              <div className="mb-7">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
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

            {cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center dark:border-white/15 dark:bg-zinc-900">
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
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
                    On your streets
                  </h2>
                  {local.length > 0 ? (
                    <ul className="flex flex-col gap-3">
                      {local.map((p) => (
                        <ProjectCard key={p.id} p={p} />
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                      Nothing on your streets yet —{" "}
                      <Link href="/projects/new" className="underline">
                        yours could be the first
                      </Link>
                      .
                    </p>
                  )}
                </section>

                {city.length > 0 ? (
                  <section>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
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
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
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
      </div>
    </div>
  );
}
