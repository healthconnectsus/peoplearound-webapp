import { createAdminClient } from '@/lib/supabase/admin';
import { importConfiguration, type EventCity } from '@/lib/city-events/importer';
import { SubmitButton } from '@/components/SubmitButton';
import { configureEventCity, populateEventsNow } from './adminActions';

const BUTTON = 'rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10';
const date = (v: string | null) => v ? new Date(v).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : 'Not yet';

/** Rendered only after AdminPage's session/is_admin gate. */
export async function EventImports() {
  const admin = createAdminClient();
  if (!admin) return null;
  const config = importConfiguration();
  const [{ data, error }, { data: sources }] = await Promise.all([
    admin.from('event_cities').select('*').order('name').limit(200),
    admin.from('city_event_sources').select('city_id,url,title').order('discovered_at', { ascending: false }).limit(1000),
  ]);
  return (
    <section className="mt-8 rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-600 dark:bg-zinc-900" aria-labelledby="event-imports-title">
      <h2 id="event-imports-title" className="text-lg font-bold">City events</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Refresh local listings every week. New cities join the queue automatically;
        the worker checks for work every ten minutes.
      </p>
      <p className="mt-2 text-xs">Ticketmaster: {config.ticketmaster ? 'Connected' : 'Key needed'} · Calendar search: {config.search ? 'Connected' : 'SerpApi key needed'}</p>
      {error ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">City imports need database migration 0045 before they can run.</p> : <>
        <form action={populateEventsNow} className="mt-4">
          <SubmitButton className={BUTTON} pendingLabel="Populating…">Populate now — all cities</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">Starts one city now and queues the rest. Repeated imports update existing listings.</p>
        {!data?.length && <p className="mt-4 text-sm">No named cities yet. Assign a city to a community below to get started.</p>}
        <ul className="mt-4 space-y-4">
          {(data as EventCity[] | null)?.map(city => <li key={city.id} className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{city.name}</h3>
              <form action={populateEventsNow}>
                <input type="hidden" name="cityId" value={city.id} />
                <SubmitButton className={BUTTON} pendingLabel="Populating…">Populate {city.name} now</SubmitButton>
              </form>
            </div>
            <p className="mt-2 text-xs">{city.last_status} · {city.last_import_count} listings in last run · Last refresh: {date(city.last_success_at)}</p>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">Next: {date(city.next_run_at)}</p>
            {city.last_error && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{city.last_error}</p>}
            <form action={configureEventCity} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="cityId" value={city.id} />
              <label className="text-xs">Search location
                <input name="location" defaultValue={city.search_location} maxLength={160} required
                  className="ml-2 rounded border border-slate-400 bg-transparent px-2 py-1 text-sm" />
              </label>
              <label className="text-xs"><input type="checkbox" name="enabled" defaultChecked={city.enabled} className="mr-1" />Weekly imports</label>
              <SubmitButton className={BUTTON} pendingLabel="Saving…">Save</SubmitButton>
            </form>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">Include the state/country for ambiguous city names.</p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer">Discovered calendar websites</summary>
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">Search candidates, not verified partners. Review and enable supported calendars in Calendar sources below.</p>
              <ul className="mt-2 space-y-1">
                {(sources ?? []).filter(s => s.city_id === city.id).slice(0, 10).map(s => <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a>
                </li>)}
              </ul>
            </details>
          </li>)}
        </ul>
      </>}
    </section>
  );
}
