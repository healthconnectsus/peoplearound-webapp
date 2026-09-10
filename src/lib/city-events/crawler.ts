import 'server-only';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import ical from 'node-ical';
import robotsParser from 'robots-parser';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanTags, distinctListings, eventDate, humanWhen, record, sourceUrl, text, type Listing } from './normalize';
import { safeGet } from './safe-fetch';

export function jsonLdEvents(html:string,pageUrl:string,now:Date):Listing[] {
  const $=load(html);const found:Listing[]=[];
  function visit(value:unknown,depth=0) {
    if(depth>12||found.length>=200)return;
    if(Array.isArray(value)){value.slice(0,500).forEach(v=>visit(v,depth+1));return;}
    const e=record(value); const types=Array.isArray(e['@type'])?e['@type']:[e['@type']];
    if(types.some(t=>typeof t==='string'&&/(^|\/)([A-Za-z]*Event)$/.test(t))){
      const start=text(e.startDate,80), title=text(e.name);
      const instant=/(Z|[+-]\d{2}:\d{2})$/.test(start)&&Number.isFinite(Date.parse(start))?start:null;
      const date=eventDate(start.slice(0,10),instant?new Date(now.getTime()-86400000):now);
      let url:string|null=null;
      try { url=sourceUrl(typeof e.url==='string'?new URL(e.url,pageUrl).toString():pageUrl); } catch { /* Skip malformed links without losing sibling events. */ }
      if(date&&url&&title&&(!instant||Date.parse(instant)>=now.getTime()))found.push({provider:'calendar',external_id:text(e['@id'],1000)||`${url}|${start}`,title,event_date:date,starts_at:instant,date_label:humanWhen(start)||start,venue:text(record(e.location).name),source_url:url,source_name:new URL(pageUrl).hostname,status:String(e.eventStatus??'').includes('Cancelled')?'cancelled':'scheduled',tags:cleanTags(e.keywords??e.about)});
    }
    for(const key of ['@graph','itemListElement','item','subEvent']) if(e[key])visit(e[key],depth+1);
  }
  $('script[type="application/ld+json"]').slice(0,30).each((_i,node)=>{try{visit(JSON.parse($(node).text()));}catch{/* An invalid block doesn't turn snippets into events. */}});
  return found;
}

export async function icsEvents(body:string,url:string,now:Date):Promise<Listing[]> {
  const parsed=await ical.async.parseICS(body);const found:Listing[]=[];
  for(const value of Object.values(parsed).slice(0,500)){
    if(value?.type!=='VEVENT')continue;
    if(value.rrule&&(/FREQ=(SECONDLY|MINUTELY|HOURLY)|BYSECOND|BYMINUTE|BYHOUR/.test(value.rrule.toString())))continue;
    const occurrences=value.rrule?ical.expandRecurringEvent(value,{from:now,to:new Date(now.getTime()+90*86400000)}):[{start:value.start,summary:value.summary}];
    for(const instance of occurrences.slice(0,100)){
      if(!instance.start||!Number.isFinite(instance.start.getTime()))continue;
      const start=instance.start;
      const zone=value.start?.tz;
      const allDay=value.datetype==='date';
      const instant=!allDay&&zone?start.toISOString():null;
      const localDate=zone&&!allDay
        ?new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(start)
        :`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
      const date=eventDate(localDate,instant?new Date(now.getTime()-86400000):now);
      if(instant&&start.getTime()<now.getTime())continue;
      const title=text(instance.summary||value.summary);if(!date||!title)continue;
      const link=sourceUrl(value.url)||url;
      // A floating DTSTART (no TZID) states a wall clock and no instant, so it
      // must be shown exactly as written. Formatting its UTC equivalent turned
      // "19:00" into "1:00 AM the next day" — the one thing a time label must
      // never do. Only a zoned event has a real moment to format.
      const label=allDay
        ?`${date} (all day)`
        :zone
          ?(humanWhen(start.toISOString(),zone)||`${date} (time zone unspecified)`)
          :`${date} ${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')} (time zone unspecified)`;
      found.push({provider:'calendar',external_id:`${value.uid}|${label}`,title,event_date:date,starts_at:instant,date_label:label,venue:text(value.location),source_url:link,source_name:new URL(url).hostname,status:value.status==='CANCELLED'?'cancelled':'scheduled',tags:cleanTags(value.categories)});
      if(found.length>=500)return found;
    }
  }return found;
}

/**
 * The iCal feed a page advertises about itself.
 *
 * `<link rel="alternate" type="text/calendar">` is how WordPress calendars —
 * The Events Calendar in particular, which runs a great many parks, library
 * and community sites — point at their own feed. kcparks.org publishes one at
 * `/events/?ical=1` carrying exact start times and recurrence that its listing
 * markup leaves out.
 *
 * Same-origin only. A feed link is attacker-influenceable in exactly the way a
 * discovered URL is, and safeGet would refuse a private address anyway, but
 * there is no reason a site's own calendar should live somewhere else.
 */
export function feedUrl(
  $: ReturnType<typeof load>,
  pageUrl: string,
  root: URL,
): string | null {
  const raw = $('link[rel="alternate"][type="text/calendar"]').attr('href')
    ?? $('link[type="text/calendar"]').attr('href');
  if (!raw) return null;
  try {
    const u = new URL(raw, pageUrl);
    if (u.origin !== root.origin) return null;
    return sourceUrl(u.toString());
  } catch { return null; }
}

/**
 * Which links on a listing page are worth spending the budget on.
 *
 * The old filter took the first five same-origin links whose path contained
 * "/event", and on visitkc.com those five were `/events/page/2/`,
 * `/events/this-weekend/`, `/events/type/free-events/` and two more like them
 * — pagination and category pages, none of which carries an event. The crawl
 * spent its whole allowance on navigation and reported that the site had no
 * events, when in fact every real event page there publishes perfectly good
 * `Event` JSON-LD.
 *
 * So: drop the shapes that are navigation rather than an event, and prefer the
 * long descriptive slugs that real events have. Ordering matters more than the
 * filter, because only the first five are ever fetched.
 */
const NOT_AN_EVENT_PATH =
  /\/(page|type|category|categories|tag|tags|search|list|month|week|day|today|tomorrow|this-weekend|upcoming|past|archive|venue|venues|organizer|organizers|feed|ical)(\/|$)/i;

export function eventLinks(
  $: ReturnType<typeof load>,
  pageUrl: string,
  root: URL,
  robots: ReturnType<typeof robotsParser>,
): string[] {
  const found = new Set<string>();
  $('a[href]').each((_i, node) => {
    try {
      const u = new URL($(node).attr('href')!, pageUrl);
      if (u.origin !== root.origin) return;
      if (!/\/events?\//i.test(u.pathname)) return;
      if (u.pathname === root.pathname) return;
      if (NOT_AN_EVENT_PATH.test(u.pathname)) return;
      // A bare "/events/" with a query is a filtered listing, not an event.
      if (u.search && !/\/events?\/[^/]+\//i.test(u.pathname)) return;
      if (robots.isAllowed(u.toString(), 'PeoplearoundEvents') === false) return;
      found.add(u.toString());
    } catch { /* a malformed href is not worth losing its siblings over */ }
  });
  // Document order, deliberately. Sorting by slug length was tried first and
  // was worse: the wordiest slugs on visitkc.com belong to months-long
  // exhibitions that began in spring, so all five fetches went to events whose
  // start date had already passed and the crawl returned nothing. A listing
  // page almost always puts the soonest thing first, which is the ordering we
  // actually want, and the filter above is what removes the navigation.
  return [...found];
}

/**
 * The tags an event page shows but does not publish.
 *
 * visitkc.com puts "Free Events", "Special Events", "Sports" under each event
 * as chips, and none of it appears in the page's structured data — they are
 * links to the site's own category pages. That taxonomy shape is near
 * universal on WordPress and Drupal, so reading the link text is a general
 * answer rather than a per-site adapter.
 *
 * Only same-origin taxonomy links count. An outbound link is somebody else's
 * category, and a link to another event is not a label.
 */
const TAXONOMY_PATH = /\/(type|types|category|categories|tag|tags|topic|topics)\//i;

export function taxonomyTags(
  $: ReturnType<typeof load>,
  pageUrl: string,
  root: URL,
): string[] {
  const found: string[] = [];
  $('a[href]').each((_i, node) => {
    try {
      const u = new URL($(node).attr('href')!, pageUrl);
      if (u.origin !== root.origin) return;
      if (!TAXONOMY_PATH.test(u.pathname)) return;
      const label = $(node).text();
      if (label) found.push(label);
    } catch { /* a malformed href is not a tag */ }
  });
  return cleanTags(found);
}

export async function crawlNextCalendar(){
  const admin=createAdminClient();if(!admin)return {status:'not_configured'};
  const {data,error}=await admin.rpc('claim_event_source');if(error)return {status:'queue_unavailable'};
  const source=(data as {id:string;city_id:string;url:string;format:string;interval_hours:number;lease_token:string}[]|null)?.[0];
  if(!source)return {status:'idle'};
  const now=new Date();let count=0;let failure:string|null=null;
  // Wall-clock budget, comfortably under the route's maxDuration of 180s.
  // Worst case without it is about 165s — seven requests at up to 15s each
  // plus six crawl-delay sleeps of up to 10s — which is close enough to the
  // ceiling that a slow host tips it over. Being killed loses the listings
  // already parsed and, before 0051, re-queued the site immediately; stopping
  // early keeps what we have and lets the run finish honestly.
  const startedAt=Date.now();
  const BUDGET_MS=150_000;
  try{
    const root=new URL(source.url);const robotsUrl=new URL('/robots.txt',root).toString();
    const robotsResponse=await safeGet(robotsUrl);
    // 403/401 is the site refusing this crawler outright, which an operator
    // can act on (ask them, or drop the source). "Could not verify robots.txt"
    // sounded like our bug and told them nothing.
    if(robotsResponse.status===401||robotsResponse.status===403)
      throw new Error('This site blocks automated readers (HTTP '+robotsResponse.status+'). Ask them for a calendar feed.');
    if(robotsResponse.status!==404&&robotsResponse.status!==200)
      throw new Error(`Could not read robots.txt (HTTP ${robotsResponse.status})`);
    const robots=robotsParser(robotsUrl,robotsResponse.status===404?'':robotsResponse.body);
    if(robots.isAllowed(source.url,'PeoplearoundEvents')===false)throw new Error('Crawling disallowed by robots.txt');
    const delay=Math.max(1,robots.getCrawlDelay('PeoplearoundEvents')??1);
    if(delay>10)throw new Error('Crawl delay exceeds this worker budget; use a published feed');
    await new Promise(r=>setTimeout(r,delay*1000));
    const page=await safeGet(source.url);if(page.status!==200)throw new Error(`Calendar HTTP ${page.status}`);
    let listings:Listing[]=[];
    if(source.format==='ics')listings=await icsEvents(page.body,source.url,now);
    else{
      listings=jsonLdEvents(page.body,source.url,now);
      const $=load(page.body);
      const affordable=()=>Date.now()-startedAt <= BUDGET_MS-(delay*1000+15000);
      let stoppedEarly=false;

      // A page that publishes its own iCal feed is telling us where the real
      // data is; scraping the HTML beside it is guesswork. WordPress calendars
      // advertise it as <link rel="alternate" type="text/calendar">, and it
      // carries exact times and recurrence that the listing markup omits.
      // Merged with the scrape rather than replacing it, because a feed often
      // covers a shorter window than the page does.
      const feed=feedUrl($,source.url,root);
      if(feed&&affordable()){
        await new Promise(r=>setTimeout(r,delay*1000));
        const ics=await safeGet(feed);
        if(ics.status===200&&/BEGIN:VCALENDAR/i.test(ics.body)){
          listings.push(...await icsEvents(ics.body,feed,now));
        }
      }

      for(const link of eventLinks($,source.url,root,robots).slice(0,5)){
        // One more detail page costs a crawl-delay sleep plus a request that
        // may run the full 15s. Only start it if both still fit.
        if(!affordable()){stoppedEarly=true;break;}
        await new Promise(r=>setTimeout(r,delay*1000));
        const detail=await safeGet(link);
        if(detail.status===200){
          // A detail page's chips describe the event on that page, so they
          // belong to the events parsed from it — and only to those.
          const pageTags=taxonomyTags(load(detail.body),link,root);
          for(const e of jsonLdEvents(detail.body,link,now)){
            listings.push(e.tags.length?e:{...e,tags:pageTags});
          }
        }
      }
      if(stoppedEarly)console.warn(`[crawl] ${source.url}: stopped early on time budget`);
    }
    // Deduplicate before writing, not only when rendering.
    // This crawler reads the listing page and then follows up to five detail
    // pages, and sites publish the same event in both. Those copies carry
    // different @id/url values, so external_id alone let each event through
    // twice; the feed hid it because CityEvents deduplicates on display, but
    // the rows were still stored twice and counted twice in the admin console.
    // Same helper as the display path, so the two can never disagree.
    const unique=distinctListings(listings);

    // distinctListings answers "is this the same event to a reader". The
    // upsert asks a narrower question: is this the same ROW. Those can
    // disagree — a page that lists one event twice under slightly different
    // names yields two readable-distinct entries that hash to one external_id,
    // and Postgres refuses a batch whose ON CONFLICT target repeats
    // ("cannot affect row a second time"). That surfaced as visitkc.com
    // failing with "Could not save calendar events" while parsing perfectly
    // well. So collapse on the actual conflict key before writing, the same
    // way the importer already does.
    const rows=[...new Map(unique.map(e=>[
      createHash('sha256').update(`${source.id}|${e.external_id}`).digest('hex'),
      e,
    ])).entries()].map(([external_id,e])=>({...e,external_id,city_id:source.city_id,
      last_seen_at:now.toISOString(),expires_at:new Date(now.getTime()+8*86400000).toISOString()}));

    if(rows.length){
      const {error:writeError}=await admin.from('city_events').upsert(rows,{onConflict:'city_id,provider,external_id'});
      if(writeError)throw new Error(`Could not save calendar events: ${writeError.message}`);
    }
    count=rows.length;
    if(!count)failure='No supported dated events found. This site may require a dedicated feed or adapter.';
  }catch(e){failure=e instanceof Error?e.message:'Calendar crawl failed';}
  await admin.from('city_event_sources').update({last_crawled_at:now.toISOString(),last_count:count,last_error:failure,lease_token:null,lease_until:null,next_crawl_at:new Date(now.getTime()+source.interval_hours*3600000).toISOString()}).eq('id',source.id).eq('lease_token',source.lease_token);
  return {status:failure?'attention':'success',count};
}
