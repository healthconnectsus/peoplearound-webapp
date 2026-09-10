import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { reverseGeocode } from '@/lib/frontier';
import { isCrawlableCalendar, record, rows, sourceUrl, text, searchListings, type Listing } from './normalize';

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
export type EventCity = {
  id: string; name: string; search_location: string; lat: number | null; lng: number | null;
  enabled: boolean; next_run_at: string; lease_token: string; lease_until: string | null;
  sources_checked_at: string | null; last_attempt_at: string | null; last_success_at: string | null;
  last_status: string; last_error: string | null; last_import_count: number;
};
export type ImportResult = { status: string; city?: string; imported: number; message: string };

export function importConfiguration() {
  return { search: Boolean(process.env.SERPAPI_API_KEY) };
}

function limit(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isInteger(value) && value >= 0 && process.env[key] !== '' ? value : fallback;
}

/**
 * 15 seconds was too tight, and it failed in the worst way: silently — a slow
 * search aborted, the run reported partial success, and the only trace was
 * one line of status text in the admin console. A search normally answers in
 * about three seconds, so this is not the usual case being slow; it is the
 * occasional slow one being cut off. Each cut-off also spends a unit of the
 * monthly search budget, because the budget is reserved before the call.
 *
 * Still far inside the route's 180s ceiling: a city run is at most two
 * searches.
 */
const PROVIDER_TIMEOUT_MS = 30000;

async function apiJson(url: URL) {
  // Only fixed provider hosts call this function. Never fetch discovered URLs.
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (record(data).error) throw new Error('Provider rejected the search; check key and quota.');
  return data;
}

async function search(admin: Admin, query: string) {
  const { data, error } = await admin.rpc('consume_event_search', {
    p_month_limit: limit('EVENT_SEARCH_MONTHLY_LIMIT', 200),
    p_hour_limit: limit('EVENT_SEARCH_HOURLY_LIMIT', 40),
  });
  if (error || data !== true) throw new Error('Search budget unavailable or exhausted.');
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({ engine: 'google', api_key: process.env.SERPAPI_API_KEY!, q: query, hl: 'en' }).toString();
  return apiJson(url);
}

/**
 * Give a bare city name its state before searching with it.
 *
 * A new city is registered from a neighborhood, which stores only a name and
 * a centre — there is no state column — so `search_location` starts as just
 * "Springfield", and the search engine takes that literally: it returned
 * calendars from Illinois, Oregon and a county in Georgia, and those became
 * candidate crawl sources for a Missouri neighborhood.
 *
 * The centre coordinates already resolve this, and the app already has a
 * reverse geocoder for the frontier flow, so one Nominatim call per city
 * fixes it permanently: the result is written back, and every later run sees
 * a comma and skips this entirely.
 *
 * The stored name is kept and the region appended, never replaced. Replacing
 * it would silently rename a community to whatever OpenStreetMap calls that
 * point, which is a much worse failure than an unqualified search.
 */
async function qualifySearchLocation(admin: Admin, city: EventCity): Promise<string> {
  const current = city.search_location.trim();
  if (current.includes(',') || city.lat == null || city.lng == null) return current;
  try {
    const { region } = await reverseGeocode(city.lat, city.lng);
    if (!region) return current;
    const qualified = `${current}, ${region}`;
    await admin.from('event_cities').update({ search_location: qualified })
      .eq('id', city.id).eq('lease_token', city.lease_token);
    return qualified;
  } catch {
    // A geocoder outage must not stop the import; the unqualified name still
    // works, just less precisely.
    return current;
  }
}

async function discoverSources(admin: Admin, city: EventCity, now: Date, where: string) {
  // `where` is the qualified location, not the bare city name: discovery is
  // exactly where an ambiguous name did damage, turning calendars from three
  // other states into candidate crawl sources.
  const payload = await search(admin, `${where} official tourism city library parks community events calendar`);
  const sources = rows(record(payload).organic_results).slice(0, 10).flatMap(value => {
    const r = record(value), url = sourceUrl(r.link), title = text(r.title);
    if (!url || !title || !isCrawlableCalendar(url)) return [];
    return [{ city_id: city.id, url, title }];
  });
  // A known calendar supplied by the owner; discovery adds other local sources.
  if (/^kansas city$/i.test(city.name)) sources.push({ city_id: city.id, url: 'https://www.visitkc.com/events/', title: 'Visit KC events calendar' });
  if (sources.length) {
    const unique = [...new Map(sources.map(s => [s.url, s])).values()];
    const { error } = await admin.from('city_event_sources').upsert(unique, { onConflict: 'city_id,url' });
    if (error) throw new Error('Could not save discovered calendars.');
  }
  const { error } = await admin.from('event_cities').update({ sources_checked_at: now.toISOString() })
    .eq('id', city.id).eq('lease_token', city.lease_token);
  if (error) throw new Error('Could not save calendar discovery status.');
}

async function saveListings(admin: Admin, city: EventCity, listings: Listing[], now: Date) {
  if (!listings.length) return 0;
  const data = [...new Map(listings.map(e => [e.external_id, e])).values()].map(e => ({
    ...e, external_id: createHash('sha256').update(e.external_id).digest('hex'), city_id: city.id,
    last_seen_at: now.toISOString(), expires_at: new Date(now.getTime() + 8 * 86400000).toISOString(),
  }));
  const { error } = await admin.from('city_events').upsert(data, { onConflict: 'city_id,provider,external_id' });
  if (error) throw new Error('Could not save imported listings. Check migration 0045.');
  return data.length;
}

/** Used by cron and the admin action. Never invoked by a public user action. */
export async function populateCity(cityId?: string): Promise<ImportResult> {
  const config = importConfiguration();
  if (!config.search) return { status: 'not_configured', imported: 0, message: 'Add a SerpApi key to enable imports.' };
  const admin = createAdminClient();
  if (!admin) return { status: 'not_configured', imported: 0, message: 'Service role is not configured.' };
  const { data, error } = await admin.rpc('claim_event_city', { p_city_id: cityId ?? null });
  if (error) return { status: 'error', imported: 0, message: 'Import queue unavailable. Apply migration 0045.' };
  const city = (data as EventCity[] | null)?.[0];
  if (!city) return { status: 'idle', imported: 0, message: 'No city is due, or an import is already running.' };
  const now = new Date(), errors: string[] = [];
  let imported = 0, successes = 0;
  // Resolved once and reused by both the listing search and discovery, so a
  // city costs at most one geocode ever.
  const where = config.search ? await qualifySearchLocation(admin, city) : city.search_location;
  if (config.search) {
    try {
      const payload = await search(admin, `community events in ${where} upcoming ${now.getUTCFullYear()}`);
      imported += await saveListings(admin, city, searchListings(payload, now), now); successes++;
    } catch (e) { errors.push(`Search: ${e instanceof Error ? e.message : 'import failed'}`); }
    if (!city.sources_checked_at || Date.parse(city.sources_checked_at) < now.getTime() - 30 * 86400000) {
      try { await discoverSources(admin, city, now, where); }
      catch (e) { errors.push(`Calendars: ${e instanceof Error ? e.message : 'discovery failed'}`); }
    }
  }
  const status = errors.length ? (successes ? 'partial' : 'error') : 'success';
  const message = errors.join(' ').slice(0, 600);
  const { error: finishError } = await admin.from('event_cities').update({
    lease_token: null, lease_until: null, last_status: status, last_error: message || null,
    last_import_count: imported,
    ...(successes ? { last_success_at: now.toISOString() } : {}),
    next_run_at: new Date(now.getTime() + (errors.length ? 1 : 7) * 86400000).toISOString(),
  }).eq('id', city.id).eq('lease_token', city.lease_token);
  if (finishError) return { status: 'error', city: city.name, imported, message: 'Listings saved, but queue status could not be updated; the lease will expire.' };
  return { status, city: city.name, imported,
    message: message || `${city.name}: ${imported} listings refreshed. Next automatic refresh in seven days.` };
}
