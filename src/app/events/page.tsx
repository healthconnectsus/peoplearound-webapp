import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { myMapCenter, projectPinsByIds } from "@/lib/mapPins";
import { FeedTabs, readTabFrom } from "@/components/FeedTabs";
import { EVENT_TABS, sortEventsForTab } from "@/lib/eventSort";
import { PlanEventButton } from "./PlanEventButton";
import { categoryMeta } from "@/lib/projects";
import {
  formatEventTime,
  isUpcomingEvent,
  type ProjectEvent,
} from "@/lib/projects";

export const metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = readTabFrom(rawTab, EVENT_TABS);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eventRows } = await supabase
    .from("events")
    .select(
      "id,project_id,title,starts_at,place,photo_url,created_at,rsvps(user_id),project:projects(title)",
    )
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  const events = ((eventRows ?? []) as unknown as ProjectEvent[]).filter((e) =>
    isUpcomingEvent(e.starts_at),
  );

  const pins = await projectPinsByIds(
    supabase,
    events.map((e) => e.project_id),
  );

  // "Nearby" measures from the viewer's own centre to each event's project
  // pin. Both are already loaded for the map, so the tab costs one extra
  // query rather than a second pass over the events.
  const center = await myMapCenter(supabase, user.id);
  const placeOf = new Map(
    pins.map((p) => [p.id, { lat: p.lat, lng: p.lng }] as const),
  );

  // Events hang off projects, so "plan an event" needs to know which one.
  // Founders and co-organizers are the people allowed to run them.
  const [{ data: ownRows }, { data: coOrgRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,category")
      .eq("owner_id", user.id)
      .neq("state", "archived"),
    supabase
      .from("memberships")
      .select("role,status,project:projects(id,title,category,state)")
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .eq("role", "co_organizer"),
  ]);

  type Steward = { id: string; title: string; category: string };
  const stewarded = new Map<string, Steward>();
  for (const r of (ownRows ?? []) as Steward[]) stewarded.set(r.id, r);
  for (const m of (coOrgRows ?? []) as unknown as {
    project?: (Steward & { state: string }) | null;
  }[]) {
    if (m.project && m.project.state !== "archived") {
      stewarded.set(m.project.id, m.project);
    }
  }
  const stewardedProjects = [...stewarded.values()].map((p) => ({
    id: p.id,
    title: p.title,
    emoji: categoryMeta(p.category).emoji,
  }));

  // The chosen tab rearranges the same events the query already returned;
  // only "Mine" narrows, and it narrows to things the viewer committed to.
  const visible = sortEventsForTab(events, tab, {
    userId: user.id,
    center,
    placeOf,
    stewardedIds: new Set(stewarded.keys()),
  });
  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Events</h1>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Where projects become real — show up and meet the people behind
                them.
              </p>
            </div>
            <PlanEventButton projects={stewardedProjects} />
          </div>

          <div className="mt-5" id="events">
            <FeedTabs
              active={tab}
              basePath="/events"
              tabs={EVENT_TABS}
              ariaLabel="Sort the events"
              hash="events"
            />
          </div>

          <h2 className="mt-6 text-xl font-bold">With your project teams</h2>
          {visible.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-400 bg-white p-10 text-center dark:border-slate-500 dark:bg-zinc-900">
              <p className="text-3xl" aria-hidden>
                📅
              </p>
              {/*
                "Mine" is the one tab that narrows, so it is the one tab that
                can empty a page which is not actually empty. Saying "no
                upcoming events" there would be false, and would send someone
                away from a board that has plenty on it.
              */}
              {events.length > 0 ? (
                <>
                  <p className="mt-3 font-medium">
                    Nothing here is yours yet
                  </p>
                  <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                    There {events.length === 1 ? "is" : "are"} {events.length}{" "}
                    upcoming {events.length === 1 ? "event" : "events"} around
                    you — say you&rsquo;re coming to one and it shows up here.
                  </p>
                  <Link
                    href="/events"
                    className="mt-4 inline-block rounded-lg border-2 border-slate-500 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-400 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    See what&rsquo;s on
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-3 font-medium">No upcoming events</p>
                  <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                    Events are created inside projects. Join one — or start
                    your own and rally the neighbors.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {visible.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/projects/${e.project_id}`}
                    className="flex flex-col gap-1 overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-zinc-900"
                  >
                    {e.photo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element --
                         Supabase Storage, downscaled at upload. */
                      <img
                        src={e.photo_url}
                        alt={e.place ? `Photo of ${e.place}` : ""}
                        className="-mx-4 -mt-4 mb-2 h-32 w-[calc(100%+2rem)] object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <span className="font-medium">📅 {e.title}</span>
                    <span className="text-sm text-black/60 dark:text-white/60">
                      {formatEventTime(e.starts_at)}
                      {e.place ? ` · ${e.place}` : ""} · 🙋 {e.rsvps.length} going
                    </span>
                    {e.project?.title ? (
                      <span className="text-xs text-black/45 dark:text-white/45">
                        Part of “{e.project.title}”
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </MapShell>
    </AppShell>
  );
}
