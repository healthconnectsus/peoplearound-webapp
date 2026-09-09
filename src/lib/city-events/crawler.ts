import 'server-only';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import ical from 'node-ical';
import robotsParser from 'robots-parser';
import { createAdminClient } from '@/lib/supabase/admin';
import { distinctListings, eventDate, record, sourceUrl, text, type Listing } from './normalize';
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
      if(date&&url&&title&&(!instant||Date.parse(instant)>=now.getTime()))found.push({provider:'calendar',external_id:text(e['@id'],1000)||`${url}|${start}`,title,event_date:date,starts_at:instant,date_label:start,venue:text(record(e.location).name),source_url:url,source_name:new URL(pageUrl).hostname,status:String(e.eventStatus??'').includes('Cancelled')?'cancelled':'scheduled'});
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
      const label=allDay?`${date} (all day)`:instant??`${date} ${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')} (time zone unspecified)`;
      found.push({provider:'calendar',external_id:`${value.uid}|${label}`,title,event_date:date,starts_at:instant,date_label:label,venue:text(value.location),source_url:link,source_name:new URL(url).hostname,status:value.status==='CANCELLED'?'cancelled':'scheduled'});
      if(found.length>=500)return found;
    }
  }return found;
}

export async function crawlNextCalendar(){
  const admin=createAdminClient();if(!admin)return {status:'not_configured'};
  const {data,error}=await admin.rpc('claim_event_source');if(error)return {status:'queue_unavailable'};
  const source=(data as {id:string;city_id:string;url:string;format:string;interval_hours:number;lease_token:string}[]|null)?.[0];
  if(!source)return {status:'idle'};
  const now=new Date();let count=0;let failure:string|null=null;
  try{
    const root=new URL(source.url);const robotsUrl=new URL('/robots.txt',root).toString();
    const robotsResponse=await safeGet(robotsUrl);
    if(robotsResponse.status!==404&&robotsResponse.status!==200)throw new Error('Could not verify robots.txt');
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
      const $=load(page.body);const links=new Set<string>();
      $('a[href]').each((_i,node)=>{try{const u=new URL($(node).attr('href')!,source.url);if(u.origin===root.origin&&/\/events?\//i.test(u.pathname)&&u.pathname!==root.pathname&&robots.isAllowed(u.toString(),'PeoplearoundEvents')!==false)links.add(u.toString());}catch{}});
      for(const link of [...links].slice(0,5)){
        await new Promise(r=>setTimeout(r,delay*1000));
        const detail=await safeGet(link);if(detail.status===200)listings.push(...jsonLdEvents(detail.body,link,now));
      }
    }
    // Deduplicate before writing, not only when rendering.
    // This crawler reads the listing page and then follows up to five detail
    // pages, and sites publish the same event in both. Those copies carry
    // different @id/url values, so external_id alone let each event through
    // twice; the feed hid it because CityEvents deduplicates on display, but
    // the rows were still stored twice and counted twice in the admin console.
    // Same helper as the display path, so the two can never disagree.
    const unique=distinctListings(listings);
    if(unique.length){const {error:writeError}=await admin.from('city_events').upsert(unique.map(e=>({...e,external_id:createHash('sha256').update(`${source.id}|${e.external_id}`).digest('hex'),city_id:source.city_id,last_seen_at:now.toISOString(),expires_at:new Date(now.getTime()+8*86400000).toISOString()})),{onConflict:'city_id,provider,external_id'});if(writeError)throw new Error('Could not save calendar events');}
    count=unique.length;
    if(!count)failure='No supported dated events found. This site may require a dedicated feed or adapter.';
  }catch(e){failure=e instanceof Error?e.message:'Calendar crawl failed';}
  await admin.from('city_event_sources').update({last_crawled_at:now.toISOString(),last_count:count,last_error:failure,lease_token:null,lease_until:null,next_crawl_at:new Date(now.getTime()+source.interval_hours*3600000).toISOString()}).eq('id',source.id).eq('lease_token',source.lease_token);
  return {status:failure?'attention':'success',count};
}
