import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Compile the pure TS module in memory; no build artifacts or live APIs.
const source = readFileSync(new URL('../src/lib/city-events/normalize.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { eventDate, sourceUrl, searchListings, distinctListings, text, isCrawlableCalendar, humanWhen, cleanTags } =
  await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const now = new Date('2026-09-09T12:00:00Z');

test('only valid upcoming dates; no rollover or guessed ranges', () => {
  assert.equal(eventDate('Sep 10', now), '2026-09-10');
  for (const d of ['Sep 8', 'Sep 10, 2025', '2026-02-30', 'Sep 9–12', 'tomorrow', '2027-09-09', '2026-13-01']) {
    assert.equal(eventDate(d, now), null, d);
  }
  assert.equal(eventDate('Jan 2', new Date('2026-12-30T12:00:00Z')), '2027-01-02');
});

test('source links reject executable, credentialed, and local URLs', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://127.0.0.1', 'https://host.local', 'https://10.1.1.1', 'https://172.16.0.1', 'https://[::1]']) {
    assert.equal(sourceUrl(url), null, url);
  }
  assert.equal(sourceUrl('https://example.com/event?id=1&utm_source=google#top'), 'https://example.com/event?id=1');
});

test('current Google inline schemas supported; undated or unlinked search hits never become events', () => {
  const result = searchListings({ events_results: [
    { title: 'Library fair', date: 'Sep 12', time: '3 PM', link: 'https://library.org/event/1', address: ['Library', 'Kansas City'] },
    { title: 'Park walk', date: { start_date: 'Sep 13', when: 'Sunday, 10 AM' }, ticket_info: [{ link: 'https://parks.org/walk' }] },
    { title: 'Missing date', link: 'https://example.com/1' },
    { title: 'Missing source', date: 'Sep 14' },
  ], organic_results: [{ title: 'Calendar', link: 'https://example.com/calendar' }] }, now);
  assert.equal(result.length, 2);
  assert.equal(result[0].starts_at, null);
  assert.equal(result[0].event_date, '2026-09-12');
  assert.equal(result[1].source_name, 'parks.org');
});


test('cross-provider duplicates collapse without hiding different dates or venues', () => {
  const base = { title: 'Park fair!', event_date: '2026-09-12', venue: 'Main Park', date_label: 'Sep 12, 10 AM', starts_at: null };
  assert.equal(distinctListings([
    base,
    { ...base, title: 'Park Fair' },              // punctuation and case only
    { ...base, venue: 'West Park' },              // a different place
    { ...base, event_date: '2026-09-13' },        // a different day
    { ...base, date_label: 'Sep 12, 2 PM' },      // a different undated showtime
  ]).length, 4);

  // The case this was rewritten for: one event read from a site's iCal feed
  // and again from its listing markup. Same title, same day, same instant —
  // but the feed spells out the address and each labels the time its own way.
  const feed = { title: 'Military Day at KC Northern Miniature Railroad', event_date: '2026-09-12',
    starts_at: '2026-09-12T15:00:00+00:00', date_label: '2026-09-12T15:00:00.000Z',
    venue: 'Kansas City Northern Miniature Railroad, 6060 NW Waukomis Dr., Kansas City, MO, 64151, United States' };
  // The scrape reports the same instant in local-offset form, which is the
  // detail that defeated the first attempt at this.
  const scraped = { ...feed, starts_at: '2026-09-12T10:00:00-05:00',
    date_label: '2026-09-12T10:00:00-05:00',
    venue: 'Kansas City Northern Miniature Railroad' };
  assert.equal(distinctListings([feed, scraped]).length, 1, 'the same event from two sources is one row');

  // And the survivor is the copy that says more. A site's feed carries
  // CATEGORIES its listing page does not, and the page is read first — so
  // keeping whichever arrived first silently discarded every tag.
  const tagless = { ...scraped, tags: [] };
  const tagged = { ...feed, tags: ['Nature', 'Public Meeting'] };
  assert.deepEqual(distinctListings([tagless, tagged])[0].tags, ['Nature', 'Public Meeting']);
  assert.deepEqual(distinctListings([tagged, tagless])[0].tags, ['Nature', 'Public Meeting']);

  // Order still follows the source, so a list reads as its source ordered it.
  const later = { ...feed, event_date: '2026-09-20', starts_at: '2026-09-20T15:00:00+00:00' };
  assert.deepEqual(distinctListings([later, tagged]).map(e => e.event_date),
    ['2026-09-20', '2026-09-12']);

  // Two real showings of the same thing on one day are still two.
  assert.equal(distinctListings([
    { ...feed, starts_at: '2026-09-12T15:00:00+00:00' },
    { ...feed, starts_at: '2026-09-12T19:00:00+00:00' },
  ]).length, 2);

  // Same title and time at genuinely different places stays separate.
  assert.equal(distinctListings([
    { ...feed, venue: 'Central Branch, 14 W 10th St' },
    { ...feed, venue: 'Plaza Branch, 4801 Main St' },
  ]).length, 2);
});


function compileWithMocks(file, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}

test('import orchestration: repeat writes, budgets, missing keys and locked cities', async () => {
  const savedFetch = globalThis.fetch;
  const oldKey = process.env.SERPAPI_API_KEY;
  const normalizers = { record: v => v && typeof v === 'object' && !Array.isArray(v) ? v : {},
    rows: v => Array.isArray(v) ? v : [], sourceUrl,
    text: (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : '',
    searchListings, isCrawlableCalendar };
  const city = { id: 'city-1', name: 'Kansas City', search_location: 'Kansas City, Missouri', lat: 39.09, lng: -94.58,
    lease_token: 'lease-1', sources_checked_at: new Date().toISOString() };
  const writes = [], requests = [], finishes = [];
  let available = true, budget = true, failSearch = false;
  const db = {
    rpc: async name => ({ data: name === 'claim_event_city' ? (available ? [city] : []) : budget, error: null }),
    from: table => ({
      upsert: async (data, options) => { writes.push({ table, data, options }); return { error: null }; },
      update: value => {
        finishes.push(value);
        const chain = { eq: () => chain, then: resolve => Promise.resolve({ error: null }).then(resolve) }; return chain;
      },
    }),
  };
  const geocodes = [];
  const { populateCity } = compileWithMocks('../src/lib/city-events/importer.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => db }, './normalize': normalizers,
    '@/lib/frontier': { reverseGeocode: async (lat, lng) => { geocodes.push([lat, lng]); return { name: 'x', city: 'Kansas City', region: 'Missouri, United States' }; } },
  });
  const soon = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  globalThis.fetch = async input => {
    const url = new URL(input); requests.push(url);
    // The ticketing provider was removed, so the search host is now the ONLY
    // host this importer may contact. Anything else is a regression.
    assert.equal(url.hostname, 'serpapi.com');
    assert.equal(url.searchParams.get('engine'), 'google');
    if (failSearch) return new Response('', { status: 503 });
    return Response.json({ events_results: [
      { title: 'Park festival', date: soon, link: 'https://parks.example.org/festival' },
    ] });
  };
  try {
    delete process.env.SERPAPI_API_KEY;
    assert.equal((await populateCity()).status, 'not_configured');
    assert.equal(requests.length, 0, 'no key means no outbound call');

    process.env.SERPAPI_API_KEY = 'fixture';
    assert.equal((await populateCity()).status, 'success');
    await populateCity();
    // The same listing on two runs is one row, not two.
    assert.equal(writes[0].data[0].external_id, writes[1].data[0].external_id);
    assert.equal(writes[0].options.onConflict, 'city_id,provider,external_id');
    assert.equal(writes[0].data[0].city_id, city.id);
    assert.equal(writes[0].data[0].provider, 'serpapi');
    const until = Date.parse(finishes.at(-1).next_run_at) - Date.now();
    assert.ok(until > 6.9 * 86400000 && until <= 7 * 86400000, 'success schedules a week out');

    // Nothing due: claim returns no city and no request goes out.
    available = false;
    const before = requests.length;
    assert.equal((await populateCity()).status, 'idle');
    assert.equal(requests.length, before);

    // The fixture city already reads "Kansas City, Missouri", so the one-off
    // geocode that qualifies a bare name must never fire.
    assert.equal(geocodes.length, 0);

    // A provider outage is reported, not swallowed, and retried tomorrow.
    available = true; failSearch = true;
    assert.equal((await populateCity()).status, 'error');
    assert.match(finishes.at(-1).last_error, /Search/);
    const retry = Date.parse(finishes.at(-1).next_run_at) - Date.now();
    assert.ok(retry <= 86400000, 'a failure retries within a day');

    // Budget exhausted: refuse before spending a request.
    failSearch = false; budget = false;
    const beforeBudget = requests.length;
    assert.equal((await populateCity()).status, 'error');
    assert.equal(requests.length, beforeBudget);
  } finally {
    globalThis.fetch = savedFetch;
    if (oldKey === undefined) delete process.env.SERPAPI_API_KEY; else process.env.SERPAPI_API_KEY = oldKey;
  }
});

test('calendar parsing preserves local dates, rejects malformed events and expands bounded recurrences', async () => {
  const normalize = compileWithMocks('../src/lib/city-events/normalize.ts', {});
  const { jsonLdEvents, icsEvents } = compileWithMocks('../src/lib/city-events/crawler.ts', {
    'server-only': {}, '@/lib/supabase/admin': {}, './normalize': normalize, './safe-fetch': {},
  });
  const html = `<script type="application/ld+json">${JSON.stringify({'@graph':[
    {'@type':'Event',name:'Bad link',startDate:'2026-09-12',url:'https://['},
    {'@type':'Event',name:'Library fair',startDate:'2026-09-12',url:'/fair'},
    {'@type':'Event',name:'No date',url:'/empty'},
    {'@type':'MusicEvent',name:'Cancelled',startDate:'2026-09-13T20:00:00-05:00',eventStatus:'https://schema.org/EventCancelled'},
  ]})}</script>`;
  const events=jsonLdEvents(html,'https://library.org/events',now);
  assert.equal(events.length,2);
  assert.equal(events[0].starts_at,null);
  assert.equal(events[0].source_url,'https://library.org/fair');
  assert.equal(events[1].status,'cancelled');
  const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+[
    ['all',';VALUE=DATE:20260912',''],
    ['floating',':20260912T190000',''],
    ['zoned',';TZID=America/Chicago:20260912T190000',''],
    ['repeat',':20260913T120000Z','RRULE:FREQ=DAILY;COUNT=3\r\n'],
    ['dense',':20260913T120000Z','RRULE:FREQ=SECONDLY;COUNT=100000\r\n'],
  ].map(([id,start,rrule])=>`BEGIN:VEVENT\r\nUID:${id}\r\nDTSTART${start}\r\nSUMMARY:${id}\r\n${rrule}END:VEVENT\r\n`).join('')+'END:VCALENDAR';
  const parsed=await icsEvents(ics,'https://library.org/calendar.ics',now);
  assert.equal(parsed.length,6);
  assert.equal(parsed.find(e=>e.title==='all').starts_at,null);
  assert.equal(parsed.find(e=>e.title==='all').event_date,'2026-09-12');
  assert.equal(parsed.find(e=>e.title==='floating').starts_at,null);
  assert.match(parsed.find(e=>e.title==='floating').date_label,/19:00/);
  assert.equal(parsed.find(e=>e.title==='zoned').event_date,'2026-09-12');
  assert.equal(parsed.find(e=>e.title==='zoned').starts_at,'2026-09-13T00:00:00.000Z');
});

test('crawler blocks DNS resolving to private addresses before connecting', async () => {
  let connections=0;
  const {safeGet}=compileWithMocks('../src/lib/city-events/safe-fetch.ts',{
    'server-only':{}, './normalize':{sourceUrl},
    'node:dns/promises':{resolve4:async()=>['127.0.0.1']},
    'node:https':{request:()=>{connections++;throw Error('Unexpected connection');}},
  });
  await assert.rejects(safeGet('https://example.org/calendar'),/Non-public/);
  assert.equal(connections,0);
});

test('welcome emails honor opt-outs, escape content and retry with the same persisted payload', async () => {
  const savedFetch=globalThis.fetch, oldKey=process.env.RESEND_API_KEY;
  let optedOut=true, fail=true, payload=null;
  const calls=[],updates=[];
  const db={rpc:async name=>({error:null,data:name==='claim_welcome_mail'
    ?[{user_id:'fixture-user',attempts:1,payload}]
    :{email:'person@real.org',verified:true,opt_out:optedOut,name:'<img src=x>',neighborhood:'Town',neighbors:2,events:[{title:'<b>fair</b>',href:'https://library.org/fair',date_label:'Tomorrow'}]}}),
    from:()=>({update:value=>({eq:async()=>{updates.push(value);if(value.payload)payload=value.payload;return {error:null};}})})};
  const {sendWelcomeBatch}=compileWithMocks('../src/lib/welcome.ts',{'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/site':{SITE_URL:'https://peoplearound.com'}});
  globalThis.fetch=async(_url,options)=>{calls.push(options);return new Response('',{status:fail?503:200});};
  try{
    process.env.RESEND_API_KEY='fixture';
    await sendWelcomeBatch();assert.equal(calls.length,0);assert.equal(updates.at(-1).status,'skipped');
    optedOut=false;await sendWelcomeBatch();
    assert.equal(updates.at(-1).status,'pending');
    const body=JSON.parse(calls[0].body);
    assert.match(body.html,/&lt;img src=x&gt;/);assert.doesNotMatch(body.html,/<b>fair/);
    fail=false;assert.equal((await sendWelcomeBatch()).sent,1);
    assert.equal(calls[0].body,calls[1].body);
    assert.equal(calls[1].headers['Idempotency-Key'],'welcome/fixture-user');
  }finally{globalThis.fetch=savedFetch;if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey;}
});

test('calendar and welcome cron routes require the server secret', async () => {
  const old=process.env.CRON_SECRET;
  try{
    process.env.CRON_SECRET='fixture';
    for(const [file,module,method] of [
      ['crawl-city-events','@/lib/city-events/crawler','crawlNextCalendar'],
      ['welcome-neighbors','@/lib/welcome','sendWelcomeBatch'],
    ]){
      let calls=0;
      const {GET}=compileWithMocks(`../src/app/api/${file}/route.ts`,{[module]:{[method]:async()=>{calls++;return {status:'ok'};}}});
      assert.equal((await GET(new Request(`https://example.org/api/${file}`))).status,401);
      assert.equal(calls,0);
      assert.equal((await GET(new Request(`https://example.org/api/${file}`,{headers:{authorization:'Bearer fixture'}}))).status,200);
      assert.equal(calls,1);
    }
  }finally{if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});

test('cron rejects anonymous calls before invoking privileged importer', async () => {
  const old = process.env.CRON_SECRET;
  let calls = 0;
  const { GET } = compileWithMocks('../src/app/api/import-city-events/route.ts', {
    '@/lib/city-events/importer': { populateCity: async () => { calls++; return { status: 'success' }; } },
  });
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new Request('https://example.com/api/import-city-events'))).status, 401);
    process.env.CRON_SECRET = 'fixture';
    assert.equal((await GET(new Request('https://example.com/api/import-city-events'))).status, 401);
    assert.equal(calls, 0);
    assert.equal((await GET(new Request('https://example.com/api/import-city-events', { headers: { authorization: 'Bearer fixture' } }))).status, 200);
    assert.equal(calls, 1);
  } finally { if (old === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = old; }
});

test('titles are HTML-decoded before storage, and stay safe', () => {
  // Real calendars publish JSON-LD with escaped text; the first crawl of
  // kcparks.org stored "KC Chief&#8217;s Red Thursday Pep Rally" verbatim.
  assert.equal(text('KC Chief&#8217;s Red Thursday Pep Rally'), 'KC Chief’s Red Thursday Pep Rally');
  assert.equal(text('Repair Caf&#xe9; &amp; Swap'), 'Repair Café & Swap');
  assert.equal(text('Books &ndash; Bagels &hellip;'), 'Books – Bagels …');
  // Whitespace from pretty-printed JSON-LD collapses.
  assert.equal(text('Garden   Work\n  Day'), 'Garden Work Day');
  // Unknown and unsafe escapes are left alone rather than guessed at.
  assert.equal(text('a &bogus; b'), 'a &bogus; b');
  assert.equal(text('lone &#55296; surrogate'), 'lone &#55296; surrogate');
  // Decoding cannot smuggle markup past the clamp.
  assert.equal(text('&lt;script&gt;'), '<script>');
  assert.equal(text('&#38;#60;'), '&#60;');
  // Non-strings stay empty.
  for (const v of [null, undefined, 42, {}]) assert.equal(text(v), '');
});

test('social pages are never accepted as calendar sources', () => {
  // Discovery kept proposing these. They publish no structured events, their
  // robots.txt forbids this crawler, and they crowd real council and library
  // calendars out of the admin's approval list.
  for (const url of [
    'https://www.facebook.com/visitaurora/posts/longer-days',
    'https://facebook.com/x', 'https://m.facebook.com/x',
    'https://www.youtube.com/watch?v=1', 'https://youtu.be/abc',
    'https://twitter.com/x', 'https://x.com/x', 'https://www.instagram.com/x',
    'https://en.wikipedia.org/wiki/Aurora', 'https://www.yelp.com/biz/x',
    'not a url', '',
  ]) assert.equal(isCrawlableCalendar(url), false, url);

  // Genuine municipal, library and parks calendars must still pass.
  for (const url of [
    'https://kcparks.org/events/', 'https://kclibrary.org/calendar',
    'https://www.kcmo.gov/talk-to-us/city-calendar',
    'https://www.visitkc.com/events/', 'https://calendar.colorado.edu/',
    // A lookalike hostname must not be blocked by a naive substring match.
    'https://facebook.com.events.example.org/calendar',
  ]) assert.equal(isCrawlableCalendar(url), true, url);
});

test('a bare city name is qualified once from its coordinates, then never again', async () => {
  // "Springfield" alone returned calendars from Illinois, Oregon and a county
  // in Georgia. The centre coordinates settle it, and the result is written
  // back so the geocoder is asked once per city rather than every week.
  const savedFetch = globalThis.fetch;
  const oldKeys = ['SERPAPI_API_KEY'].map(k => process.env[k]);
  const normalizers = { record: v => v && typeof v === 'object' && !Array.isArray(v) ? v : {},
    rows: v => Array.isArray(v) ? v : [], sourceUrl, text: (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : '',
    searchListings, isCrawlableCalendar };
  const city = { id: 'c', name: 'Springfield', search_location: 'Springfield', lat: 37.21, lng: -93.29,
    lease_token: 'lease', sources_checked_at: null };
  const updates = [], queries = [];
  let geocodes = 0;
  const db = {
    rpc: async name => ({ data: name === 'claim_event_city' ? [city] : true, error: null }),
    from: () => ({
      upsert: async () => ({ error: null }),
      update: value => { updates.push(value); const c = { eq: () => c, then: r => Promise.resolve({ error: null }).then(r) }; return c; },
    }),
  };
  const { populateCity } = compileWithMocks('../src/lib/city-events/importer.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => db }, './normalize': normalizers,
    '@/lib/frontier': { reverseGeocode: async () => { geocodes++; return { name: 'Springfield', city: 'Springfield', region: 'Missouri, United States' }; } },
  });
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.hostname === 'serpapi.com') queries.push(url.searchParams.get('q'));
    return Response.json({ events_results: [], organic_results: [] });
  };
  try {
    process.env.SERPAPI_API_KEY = 'fixture';
    await populateCity();
    assert.equal(geocodes, 1, 'geocoded exactly once');
    // The qualified value is persisted, so later runs short-circuit.
    assert.ok(updates.some(u => u.search_location === 'Springfield, Missouri, United States'), JSON.stringify(updates));
    // Both the listing search and calendar discovery use the qualified name.
    assert.ok(queries.length >= 1, 'at least one search ran');
    for (const q of queries) assert.match(q, /Springfield, Missouri, United States/, q);
    // The stored name is kept, never replaced by whatever the geocoder calls
    // that point — renaming a community silently is the worse failure.
    for (const q of queries) assert.match(q, /^.*Springfield/);
  } finally {
    globalThis.fetch = savedFetch;
    ['SERPAPI_API_KEY'].forEach((k, i) => {
      if (oldKeys[i] === undefined) delete process.env[k]; else process.env[k] = oldKeys[i];
    });
  }
});

test('a listing page yields its iCal feed and real event links, not its navigation', async () => {
  const normalize = compileWithMocks('../src/lib/city-events/normalize.ts', {});
  const { feedUrl, eventLinks } = compileWithMocks('../src/lib/city-events/crawler.ts', {
    'server-only': {}, '@/lib/supabase/admin': {}, './normalize': normalize, './safe-fetch': {},
  });
  const { load } = require('cheerio');
  const robotsParser = require('robots-parser');
  const robots = robotsParser('https://example.org/robots.txt', 'User-agent: *\nAllow: /\n');

  // Shaped after the two real Kansas City sites this was written against:
  // kcparks.org advertises an iCal feed, and visitkc.com's listing page links
  // mostly to pagination and category pages.
  const page = 'https://example.org/events/';
  const $ = load(`
    <link rel="alternate" type="text/calendar" title="iCal Feed" href="https://example.org/events/?ical=1">
    <a href="/events/page/2/">2</a>
    <a href="/events/this-weekend/">This weekend</a>
    <a href="/events/type/free-events/">Free</a>
    <a href="/events/category/music/">Music</a>
    <a href="/events/tag/outdoors/">Outdoors</a>
    <a href="/events/venue/the-hall/">The Hall</a>
    <a href="/events/repair-cafe-bring-your-broken-things/">Repair café</a>
    <a href="/events/garden-work-day/">Garden work day</a>
    <a href="https://elsewhere.example.com/events/not-ours/">Other site</a>
    <a href="/events/">Same page</a>
  `);

  // The feed is what the page says it is, resolved absolute.
  assert.equal(feedUrl($, page, new URL(page)), 'https://example.org/events/?ical=1');

  const links = eventLinks($, page, new URL(page), robots);
  // Only the two genuine events survive; pagination, category, tag, venue,
  // the page itself and the off-site link are all dropped — and they keep the
  // page's own order, which is how a listing signals what is soonest.
  assert.deepEqual(links, [
    'https://example.org/events/repair-cafe-bring-your-broken-things/',
    'https://example.org/events/garden-work-day/',
  ]);

  // A page with no feed link says so rather than guessing a URL.
  assert.equal(feedUrl(load('<a href="/events/x/">x</a>'), page, new URL(page)), null);
  // A feed on someone else's domain is not this site's feed.
  assert.equal(
    feedUrl(load('<link rel="alternate" type="text/calendar" href="https://evil.example.com/f.ics">'), page, new URL(page)),
    null,
  );
});

test('event times are shown on the event’s own clock, never the reader’s', () => {
  // The same moment arrives written two ways. Both must read the same, and
  // both must say when to turn up where the event is.
  assert.equal(humanWhen('2026-09-12T15:00:00.000Z', 'America/Chicago'), 'Sat, Sep 12, 10:00 AM');
  assert.equal(humanWhen('2026-09-12T10:00:00-05:00'), 'Sat, Sep 12, 10:00 AM');
  // An offset far from the reader must not drag the date across midnight.
  assert.equal(humanWhen('2026-09-12T23:30:00+09:00'), 'Sat, Sep 12, 11:30 PM');
  // Nothing sensible in, nothing invented out.
  for (const bad of ['not a date', '', 'Sep 12']) assert.equal(humanWhen(bad), '');
});

test('a source’s own labels are kept; its navigation is not', () => {
  // iCal states them comma-joined in one CATEGORIES line.
  assert.deepEqual(cleanTags('Nature, Educational, Public Meeting'),
    ['Nature', 'Educational', 'Public Meeting']);
  // A page hands over the text of its category links, which repeats and
  // includes chrome that is not a label.
  assert.deepEqual(cleanTags(['Free Events', 'Sports', 'free events', 'All Events', 'More', '']),
    ['Free Events', 'Sports']);
  // Three chips inform; fifteen do not.
  assert.equal(cleanTags(['a1','b2','c3','d4','e5','f6','g7','h8']).length, 6);
  // Nothing sensible in, empty out — never a null to guard against.
  for (const bad of [null, undefined, 42, {}]) assert.deepEqual(cleanTags(bad), []);
});
