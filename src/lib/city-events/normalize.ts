// Pure normalizers: no API calls, secrets, database clients, or inferred times.
export type Listing = {
  provider: 'ticketmaster' | 'serpapi' | 'calendar';
  external_id: string;
  title: string;
  event_date: string;
  starts_at: string | null;
  date_label: string;
  venue: string;
  source_url: string;
  source_name: string;
  status: string;
};

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
export function rows(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
export function text(value: unknown, max = 250): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function sourceUrl(value: unknown): string | null {
  try {
    const u = new URL(text(value, 2000));
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (!u.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)
      || u.hostname.endsWith('.local') || u.hostname.endsWith('.internal')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    return u.toString();
  } catch { return null; }
}

const DAY = 86400000;
export function eventDate(value: unknown, now: Date): string | null {
  const raw = text(value, 80);
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) [, year, month, day] = iso.map(Number);
  else {
    // Search results often omit the year. Accept only a single month/day,
    // in the next 90 days; never parse ranges or manufacture a start time.
    const short = /^([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(raw);
    if (!short) return null;
    month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
      .indexOf(short[1].slice(0, 3).toLowerCase()) + 1;
    if (!month) return null;
    year = short[3] ? Number(short[3]) : now.getUTCFullYear();
    day = Number(short[2]);
    // Only a Dec→Jan boundary may imply next year, not a stale September result.
    if (!short[3] && now.getUTCMonth() >= 9 && month <= 3) year++;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (parsed.getTime() < today || parsed.getTime() > today + 90 * DAY) return null;
  return parsed.toISOString().slice(0, 10);
}

export function ticketmasterListings(payload: unknown, now: Date): Listing[] {
  return rows(record(record(payload)._embedded).events).flatMap(value => {
    const e = record(value), dates = record(e.dates), start = record(dates.start);
    const venue = record(rows(record(e._embedded).venues)[0]);
    const instant = text(start.dateTime, 80);
    const startsAt = /(?:Z|[+-]\d{2}:\d{2})$/.test(instant) && Number.isFinite(Date.parse(instant)) ? instant : null;
    if (startsAt && Date.parse(startsAt) < now.getTime()) return [];
    // An upcoming evening event in America can have yesterday's UTC calendar
    // date. Trust its explicit instant; keep the venue's date for display.
    const date = eventDate(start.localDate, startsAt ? new Date(now.getTime() - DAY) : now), url = sourceUrl(e.url);
    const title = text(e.name), id = text(e.id);
    if (!date || !url || !title || !id || start.dateTBD) return [];
    const status = text(record(dates.status).code);
    return [{ provider: 'ticketmaster' as const, external_id: id, title,
      event_date: date,
      starts_at: startsAt,
      date_label: [date, start.timeTBA ? 'Time to be announced' : text(start.localTime), text(dates.timezone)].filter(Boolean).join(' · '),
      venue: [text(venue.name), text(record(venue.city).name)].filter(Boolean).join(' · '),
      source_url: url, source_name: 'Ticketmaster',
      status: status === 'canceled' || status === 'cancelled' ? 'cancelled' : status || 'scheduled',
    }];
  });
}

export function searchListings(payload: unknown, now: Date): Listing[] {
  return rows(record(payload).events_results).flatMap(value => {
    const e = record(value), d = record(e.date);
    const date = eventDate(typeof e.date === 'string' ? e.date : d.start_date, now);
    const url = sourceUrl(e.link) ?? sourceUrl(record(rows(e.ticket_info)[0]).link);
    const title = text(e.title);
    if (!date || !url || !title) return [];
    return [{ provider: 'serpapi' as const, external_id: `${url}|${date}`, title,
      event_date: date, starts_at: null,
      date_label: [date, text(d.when, 160) || text(e.time, 80)].filter(Boolean).join(' · '),
      venue: rows(e.address).map(v => text(v, 120)).filter(Boolean).join(' · ').slice(0, 250) || text(e.venue),
      source_url: url, source_name: new URL(url).hostname.replace(/^www\./, ''), status: 'scheduled',
    }];
  });
}

export function distinctListings<T extends Pick<Listing, 'title' | 'event_date' | 'venue' | 'date_label'>>(list: T[]): T[] {
  const seen = new Set<string>();
  const clean = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return list.filter(e => {
    // Be conservative: separate showtimes at the same venue are not duplicates.
    const key = `${clean(e.title)}|${e.event_date}|${clean(e.venue)}|${clean(e.date_label)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

/** Standard base32 geohash for Ticketmaster's geoPoint radius search. */
export function geoHash(lat: number, lng: number): string {
  const bounds = [[-180, 180], [-90, 90]], values = [lng, lat];
  let out = '', digit = 0;
  for (let bit = 0; bit < 35; bit++) {
    const axis = bit % 2, range = bounds[axis], mid = (range[0] + range[1]) / 2;
    const high = values[axis] >= mid;
    digit = (digit << 1) | Number(high);
    range[high ? 0 : 1] = mid;
    if (bit % 5 === 4) { out += '0123456789bcdefghjkmnpqrstuvwxyz'[digit]; digit = 0; }
  }
  return out;
}
