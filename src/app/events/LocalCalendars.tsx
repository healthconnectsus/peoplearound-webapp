import { createClient } from "@/lib/supabase/server";
import { distinctListings, type Listing } from "@/lib/city-events/normalize";

/**
 * What the city's own calendars say is on.
 *
 * This replaces the old "Around your city" block, which was removed because
 * what filled it was ticketed entertainment — touring bands and arena sport
 * sitting beside a neighbor's garden morning as though they were the same kind
 * of thing. That provider is gone entirely now (migration 0053), and what is
 * left is the parks department, the library, the city calendar: bodies that
 * publish what they are doing, read from what they already publish.
 *
 * Kept firmly secondary to neighbor-led events, and never mixed into them.
 * Nobody here started these, nobody is accountable for them the way a founder
 * is for a project, and every one is a link away to the organizer. The whole
 * value of this product is that its feed is people doing things together; a
 * listing is context, not content.
 */

type Row = Listing & { id: string };

export async function LocalCalendars() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // RLS (can_read_city_events) already limits this to cities the viewer's
  // communities are actually in, so there is nothing to scope here.
  const { data, error } = await supabase
    .from("city_events")
    .select(
      "id,title,event_date,starts_at,date_label,venue,source_url,source_name,provider,status",
    )
    .eq("provider", "calendar")
    .gte("event_date", now.slice(0, 10))
    .gt("expires_at", now)
    .neq("status", "cancelled")
    .order("event_date")
    .limit(60);

  // Shipping this ahead of its migration must never break a neighbor's own
  // events, which are the point of the page.
  if (error) return null;

  const listings = distinctListings((data ?? []) as Row[]).slice(0, 12);
  if (listings.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="local-calendars-title">
      <h2 id="local-calendars-title" className="text-xl font-bold">
        Also on locally
      </h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Published by the parks department, the library and other local
        organizers. Nobody here planned these, so check the organizer&rsquo;s
        page for times and admission before you go.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {listings.map((e) => (
          <li key={e.id}>
            <a
              href={e.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-0.5 rounded-xl border border-slate-300 bg-white px-4 py-3 transition-colors hover:bg-black/[0.03] dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-white/5"
            >
              <span className="font-medium">{e.title}</span>
              <span className="text-sm text-black/55 dark:text-white/55">
                {e.date_label}
                {e.venue ? ` · ${e.venue.split(",")[0]}` : ""}
              </span>
              <span className="text-xs text-black/40 dark:text-white/40">
                {e.source_name} ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
