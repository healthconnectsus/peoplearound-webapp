'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdministrator } from '@/lib/admin';
import { sourceUrl } from '@/lib/city-events/normalize';
import { crawlNextCalendar } from '@/lib/city-events/crawler';
export async function saveCalendarSource(form:FormData){
  const {admin}=await requireAdministrator();const url=sourceUrl(form.get('url'));
  if(!url)redirect('/admin?error=Enter+a+public+HTTPS+calendar+URL');
  const city=String(form.get('cityId')??'');const title=String(form.get('title')??'').trim().slice(0,250)||new URL(url).hostname;
  const format=form.get('format')==='ics'?'ics':'jsonld';const hours=form.get('hours')==='24'?24:48;
  const {error}=await admin.from('city_event_sources').upsert({city_id:city,url,title,format,interval_hours:hours,enabled:form.get('enabled')==='on',next_crawl_at:new Date().toISOString()},{onConflict:'city_id,url'});
  if(error)redirect('/admin?error=Could+not+save+source.+Apply+migration+0049');
  revalidatePath('/admin');redirect('/admin?message=Calendar+source+saved');
}
export async function crawlCalendarsNow(){
  const {admin}=await requireAdministrator();await admin.from('city_event_sources').update({next_crawl_at:new Date().toISOString()}).eq('enabled',true).is('lease_token',null);
  const result=await crawlNextCalendar();revalidatePath('/admin');revalidatePath('/events');
  redirect(`/admin?message=${encodeURIComponent(`Calendar worker: ${result.status}. Remaining sources stay queued.`)}`);
}
