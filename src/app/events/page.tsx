import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { projectPinsByIds } from "@/lib/mapPins";
import {
  formatEventTime,
  isUpcomingEvent,
  type ProjectEvent,
} from "@/lib/projects";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eventRows } = await supabase
    .from("events")
    .select(
      "id,project_id,title,starts_at,place,created_at,rsvps(user_id),project:projects(title)",
    )
    .order("starts_at", { ascending: true })
    .limit(50);

  const events = ((eventRows ?? []) as unknown as ProjectEvent[]).filter((e) =>
    isUpcomingEvent(e.starts_at),
  );

  const pins = await projectPinsByIds(
    supabase,
    events.map((e) => e.project_id),
  );
  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-24 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Where projects become real — show up and meet the people behind them.
          </p>

          {events.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center dark:border-white/15 dark:bg-zinc-900">
              <p className="text-3xl" aria-hidden>
                📅
              </p>
              <p className="mt-3 font-medium">No upcoming events</p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Events are created inside projects. Join one — or start your own
                and rally the neighbors.
              </p>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {events.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/projects/${e.project_id}`}
                    className="flex flex-col gap-1 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-zinc-900"
                  >
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
