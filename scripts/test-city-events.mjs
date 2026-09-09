import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Compile the pure TS module in memory; no build artifacts or live APIs.
const source = readFileSync(new URL('../src/lib/city-events/normalize.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { eventDate, sourceUrl, searchListings, ticketmasterListings, distinctListings, geoHash, text } =
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

test('Ticketmaster preserves provider identity, cancellations, local times, and reschedules', () => {
  const result = ticketmasterListings({ _embedded: { events: [
    { id: 'a', name: 'Concert', url: 'https://ticketmaster.com/event/a', dates: { timezone: 'America/Chicago', start: { localDate: '2026-09-11', localTime: '19:00:00', dateTime: '2026-09-12T00:00:00Z' }, status: { code: 'canceled' } } },
    { id: 'b', name: 'TBD', url: 'https://ticketmaster.com/event/b', dates: { start: { dateTBD: true, localDate: '2026-09-12' } } },
  ] } }, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].external_id, 'a');
  assert.equal(result[0].status, 'cancelled');
  assert.equal(result[0].event_date, '2026-09-11');
  assert.match(result[0].date_label, /19:00:00.*America\/Chicago/);
  const late = ticketmasterListings({ _embedded: { events: [{ id: 'late', name: 'Evening', url: 'https://ticketmaster.com/event/late',
    dates: { start: { localDate: '2026-09-08', dateTime: '2026-09-09T03:00:00Z' } } }] } }, new Date('2026-09-09T01:00:00Z'));
  assert.equal(late.length, 1);
  assert.equal(late[0].event_date, '2026-09-08');
});

test('cross-provider duplicates collapse without hiding different dates or venues', () => {
  const base = { title: 'Park fair!', event_date: '2026-09-12', venue: 'Main Park', date_label: 'Sep 12, 10 AM' };
  assert.equal(distinctListings([base, { ...base, title: 'Park Fair' }, { ...base, venue: 'West Park' }, { ...base, event_date: '2026-09-13' }, { ...base, date_label: 'Sep 12, 2 PM' }]).length, 4);
});

test('Ticketmaster geohash matches standard reference coordinates', () => {
  assert.equal(geoHash(42.6, -5.6), 'ezs42e4');
});

function compileWithMocks(file, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}

test('import orchestration: repeat writes, provider isolation, budgets, missing keys and locked cities', async () => {
  const savedFetch = globalThis.fetch;
  const keys = ['TICKETMASTER_API_KEY', 'SERPAPI_API_KEY'];
  const oldEnv = keys.map(k => process.env[k]);
  const normalizers = { geoHash, record: v => v && typeof v === 'object' && !Array.isArray(v) ? v : {},
    rows: v => Array.isArray(v) ? v : [], sourceUrl, text: (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : '', searchListings, ticketmasterListings };
  const city = { id: 'city-1', name: 'Kansas City', search_location: 'Kansas City, Missouri', lat: 39.09, lng: -94.58,
    lease_token: 'lease-1', sources_checked_at: new Date().toISOString() };
  const writes = [], requests = [], finishes = [];
  let available = true, budget = true, failTicketmaster = false;
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
  const { populateCity } = compileWithMocks('../src/lib/city-events/importer.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => db }, './normalize': normalizers,
  });
  globalThis.fetch = async input => {
    const url = new URL(input); requests.push(url);
    if (url.hostname === 'app.ticketmaster.com') {
      if (failTicketmaster) return new Response('', { status: 503 });
      return Response.json({ page: { totalPages: 1 }, _embedded: { events: [{
        id: 'stable-id', name: 'Park festival', url: 'https://ticketmaster.com/event/1',
        dates: { start: { localDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) } },
      }] } });
    }
    assert.equal(url.hostname, 'serpapi.com');
    assert.equal(url.searchParams.get('engine'), 'google');
    return Response.json({ events_results: [] });
  };
  try {
    delete process.env.TICKETMASTER_API_KEY; delete process.env.SERPAPI_API_KEY;
    assert.equal((await populateCity()).status, 'not_configured'); assert.equal(requests.length, 0);
    process.env.TICKETMASTER_API_KEY = 'fixture';
    assert.equal((await populateCity()).status, 'success');
    await populateCity();
    assert.equal(writes[0].data[0].external_id, writes[1].data[0].external_id);
    assert.equal(writes[0].options.onConflict, 'city_id,provider,external_id');
    assert.equal(writes[0].data[0].city_id, city.id);
    const until = Date.parse(finishes.at(-1).next_run_at) - Date.now();
    assert.ok(until > 6.9 * 86400000 && until <= 7 * 86400000);
    available = false;
    const before = requests.length;
    assert.equal((await populateCity()).status, 'idle'); assert.equal(requests.length, before);
    available = true; failTicketmaster = true; process.env.SERPAPI_API_KEY = 'fixture';
    assert.equal((await populateCity()).status, 'partial');
    assert.match(finishes.at(-1).last_error, /Ticketmaster/);
    delete process.env.TICKETMASTER_API_KEY; budget = false;
    const beforeBudget = requests.length;
    assert.equal((await populateCity()).status, 'error');
    assert.equal(requests.length, beforeBudget);
  } finally {
    globalThis.fetch = savedFetch;
    keys.forEach((k, i) => oldEnv[i] === undefined ? delete process.env[k] : process.env[k] = oldEnv[i]);
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
