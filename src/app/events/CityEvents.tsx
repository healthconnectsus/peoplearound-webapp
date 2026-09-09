import { createClient } from '@/lib/supabase/server';
import { distinctListings, type Listing } from '@/lib/city-events/normalize';

export async function CityEvents() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('city_events')
    .select('id,title,event_date,starts_at,date_label,venue,source_url,source_name,provider,status')
    .or(`starts_at.gte.${now},and(starts_at.is.null,event_date.gte.${now.slice(0, 10)})`)
    .gt('expires_at', now)
    .neq('status', 'cancelled')
    .order('event_date').order('provider').limit(150);
  // Deploying code before its migration must not break neighbors' own events.
  if (error) return null;
  const listings = distinctListings((data ?? []) as (Listing & { id: string })[]);
  return <section className="mt-8" aria-labelledby="city-events-title">
    <h2 id="city-events-title" className="text-xl font-bold">Around your city</h2>
    <p className="mt-1 text-sm text-black/60 dark:text-white/60">Community and city listings from external calendars. Check the organizer’s page for current times and admission.</p>
    {listings.length ? <ul className="mt-4 flex flex-col gap-3">
      {listings.map(e => <li key={e.id} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-zinc-900">
        <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{e.title} ↗</a>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">{e.date_label}{e.venue ? ` · ${e.venue}` : ''}</p>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">Source: {e.source_name}{e.provider === 'serpapi' ? ' · Found through Google Search via SerpApi' : ''}{e.status === 'postponed' || e.status === 'rescheduled' ? ` · ${e.status}` : ''}</p>
      </li>)}
    </ul> : <p className="mt-4 text-sm text-black/50 dark:text-white/50">No imported listings for your communities yet. Check back after the next city refresh.</p>}
  </section>;
}
