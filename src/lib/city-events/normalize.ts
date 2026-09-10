// Pure normalizers: no API calls, secrets, database clients, or inferred times.
export type Listing = {
  provider: 'serpapi' | 'calendar';
  external_id: string;
  title: string;
  event_date: string;
  starts_at: string | null;
  date_label: string;
  venue: string;
  source_url: string;
  source_name: string;
  status: string;
  /** Labels the source applied, never ones we inferred (migration 0055). */
  tags: string[];
};

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
export function rows(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
/**
 * The few named entities worth spelling out. Everything else that matters is
 * numeric and handled generically below.
 */
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  ndash: '–', mdash: '—', hellip: '…',
};

/**
 * Decode HTML entities.
 *
 * Calendar pages carry their titles inside JSON-LD, already HTML-escaped, so
 * the first real crawl produced listings reading "KC Chief&#8217;s Red
 * Thursday Pep Rally". React escapes on render, so the raw entity would have
 * been shown to neighbors verbatim.
 *
 * Written out rather than pulling in a decoder: the only entity library here
 * is a transitive dependency of cheerio, and this file is also imported by a
 * component, so it must stay free of anything that assumes a Node bundle.
 * Numeric escapes are handled generically, which covers the long tail; the
 * named map only needs the handful that actually appear in event titles.
 */
function decodeEntities(input: string): string {
  if (!input.includes('&')) return input;
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    const token = body.toLowerCase();
    if (token.startsWith('#x') || token.startsWith('#')) {
      const code = token.startsWith('#x')
        ? Number.parseInt(token.slice(2), 16)
        : Number.parseInt(token.slice(1), 10);
      // Reject anything outside Unicode, and the surrogate range, which
      // String.fromCodePoint would throw on.
      if (!Number.isFinite(code) || code < 0x20 || code > 0x10ffff) return whole;
      if (code >= 0xd800 && code <= 0xdfff) return whole;
      return String.fromCodePoint(code);
    }
    return NAMED[token] ?? whole;
  });
}

export function text(value: unknown, max = 250): string {
  if (typeof value !== 'string') return '';
  // Decode first, then clamp: decoding shortens the string, so slicing first
  // could cut an entity in half and leave "&#82" in a title.
  return decodeEntities(value).replace(/\s+/g, ' ').trim().slice(0, max);
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

/**
 * When an event happens, written for a person.
 *
 * The label used to be whatever the source handed over, which meant a reader
 * saw "2026-09-12T15:00:00.000Z" from an iCal feed and
 * "2026-09-12T10:00:00-05:00" from a page's markup — the same event, twice,
 * in two machine formats.
 *
 * Both branches keep the event's OWN clock rather than the reader's. A local
 * calendar says ten in the morning because that is when to turn up; recomputing
 * that into the viewer's timezone would be technically defensible and, for a
 * neighborhood event two streets away, wrong.
 *
 * `zone` is used when the source named one (iCal usually does). Otherwise the
 * wall-clock is read straight out of the string, which is exact and needs no
 * timezone database: "2026-09-12T10:00:00-05:00" means ten o'clock where the
 * event is, whatever that offset is called.
 */
/**
 * Tidy the labels a source applied to an event.
 *
 * Sources are inconsistent: iCal hands over a comma-joined string or an array,
 * a page hands over the text of its category links, and both include things
 * that are navigation rather than description ("All Events", "More"). Kept
 * short, deduplicated case-insensitively, and capped — a listing wearing
 * fifteen labels tells a reader less than one wearing three.
 */
const NOT_A_TAG = /^(all|all events|events?|more|other|misc|miscellaneous|uncategori[sz]ed|view all|see all)$/i;

export function cleanTags(input: unknown): string[] {
  const raw: string[] = Array.isArray(input)
    ? input.flatMap(v => (typeof v === 'string' ? v.split(',') : []))
    : typeof input === 'string' ? input.split(',') : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const tag = text(value, 40);
    if (!tag || tag.length < 2 || NOT_A_TAG.test(tag)) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 6) break;
  }
  return out;
}

export function humanWhen(iso: string, zone?: string | null): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const day = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: zone || 'UTC', ...opts }).format(new Date(ms));

  if (zone) {
    return `${day({ weekday: 'short', month: 'short', day: 'numeric' })}, ${day({ hour: 'numeric', minute: '2-digit' })}`;
  }

  // No named zone: take the wall-clock the string itself states.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return '';
  const [, y, mo, d, hh, mm] = m;
  const shown = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm)));
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(shown);
  return `${fmt({ weekday: 'short', month: 'short', day: 'numeric' })}, ${fmt({ hour: 'numeric', minute: '2-digit' })}`;
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
      source_url: url, source_name: new URL(url).hostname.replace(/^www\./, ''), status: 'scheduled', tags: [],
    }];
  });
}

/**
 * Collapse the same event described twice.
 *
 * This has to survive one event arriving from two places at once. A site that
 * publishes an iCal feed *and* marks up its listing page gives us both, and
 * they disagree on the cosmetics: the feed says the venue is "Kansas City
 * Northern Miniature Railroad, 6060 NW Waukomis Dr., Kansas City, MO, 64151,
 * United States" where the page says just the name, and each labels the time
 * in its own format. Keying on those fields kept both copies, so every event
 * on kcparks.org appeared twice.
 *
 * The identity that actually holds is the title, the day, and the instant it
 * starts. `starts_at` is the authoritative moment when either source gave one,
 * so two genuine showings of the same thing on the same day stay separate, and
 * the same showing described twice does not.
 *
 * Venue is still part of the key, but only up to its first comma — enough to
 * tell two library branches apart, not enough for a postal address to make a
 * duplicate look unique.
 */
export function distinctListings<
  T extends Pick<Listing, 'title' | 'event_date' | 'venue' | 'date_label' | 'starts_at'> & { tags?: string[] },
>(list: T[]): T[] {
  const clean = (v: string) => (v ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

  /**
   * When two copies are the same event, keep the one that says more.
   *
   * This is not cosmetic. A site's iCal feed carries CATEGORIES — "Nature",
   * "Public Meeting" — that its HTML listing does not, and the page is read
   * before the feed. Keeping whichever arrived first therefore threw away
   * every tag on kcparks.org while appearing to work perfectly.
   */
  const richness = (e: T) =>
    ((e.tags?.length ?? 0) > 0 ? 4 : 0) +
    (e.starts_at ? 2 : 0) +
    ((e.venue ?? '').length > 0 ? 1 : 0);

  const best = new Map<string, T>();
  const order: string[] = [];
  for (const e of list) {
    // Compare the instant, not the text of it. The same moment reaches us
    // written two ways — an iCal feed emits "2026-09-12T14:00:00.000Z" where
    // the page's markup says "2026-09-12T09:00:00-05:00" — and as strings
    // those never match, so every event on a site that publishes both was
    // stored twice. Postgres normalises them on write, which is exactly why
    // the rows looked identical afterwards and the duplicates were puzzling.
    const instant = e.starts_at ? Date.parse(e.starts_at) : NaN;
    const when = Number.isFinite(instant) ? String(instant) : clean(e.date_label);
    const place = clean((e.venue ?? '').split(',')[0]);
    const key = `${clean(e.title)}|${e.event_date}|${when}|${place}`;
    const held = best.get(key);
    if (!held) { best.set(key, e); order.push(key); continue; }
    if (richness(e) > richness(held)) best.set(key, e);
  }
  // First-seen order, so a list still reads the way its source ordered it.
  return order.map(k => best.get(k)!);
}

/**
 * Hosts that are never a crawlable calendar, however well they rank.
 *
 * Discovery kept proposing Facebook and YouTube pages, which is wasted work
 * three times over: they publish no structured event data, their robots.txt
 * forbids this crawler, and a social post is not a calendar even when it
 * mentions events. They also crowd genuine council and library calendars out
 * of the admin's approval list, which is the real cost — the operator has to
 * read past them every time.
 */
export const NOT_A_CALENDAR = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com',
  'youtu.be', 'tiktok.com', 'pinterest.com', 'reddit.com', 'linkedin.com',
  'yelp.com', 'tripadvisor.com', 'wikipedia.org',
];

export function isCrawlableCalendar(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return !NOT_A_CALENDAR.some(bad => host === bad || host.endsWith(`.${bad}`));
  } catch {
    return false;
  }
}

