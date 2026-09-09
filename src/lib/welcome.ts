import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_URL } from '@/lib/site';
export function escapeHtml(value:unknown) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }
export async function sendWelcomeBatch() {
  const admin=createAdminClient(); const key=process.env.RESEND_API_KEY;
  if(!admin||!key)return {sent:0,status:'not_configured'};
  const {data:jobs,error}=await admin.rpc('claim_welcome_mail');
  if(error)return {sent:0,status:'queue_unavailable'};
  let sent=0;
  for(const job of (jobs??[]) as {user_id:string;attempts:number;payload:Record<string,unknown>|null}[]) {
    const {data:context,error:contextError}=await admin.rpc('welcome_context',{p_user:job.user_id});
    const c=context as {email:string;verified:boolean;name:string;opt_out:boolean;neighborhood:string;neighbors:number;events:{title:string;href:string;date_label:string}[]}|null;
    if(contextError||!c) {await admin.from('welcome_mail_jobs').update({status:job.attempts>=5?'failed':'pending',last_error:'Could not load welcome context',lease_until:null,due_at:new Date(Date.now()+3600000).toISOString()}).eq('user_id',job.user_id);continue;}
    if(c.opt_out||/@(example\.com|example\.invalid)$/i.test(c.email??'')) {
      await admin.from('welcome_mail_jobs').update({status:'skipped',lease_until:null}).eq('user_id',job.user_id);continue;
    }
    if(!c.verified||!c.email){await admin.from('welcome_mail_jobs').update({attempts:0,lease_until:null,due_at:new Date(Date.now()+86400000).toISOString()}).eq('user_id',job.user_id);continue;}
    const body=job.payload??{from:process.env.ALERT_FROM??'Peoplearound <onboarding@resend.dev>',to:[c.email],subject:`Welcome to ${c.neighborhood} on Peoplearound`,
      html:`<h1>Welcome, ${escapeHtml(c.name||'neighbor')}</h1><p>You’re part of ${escapeHtml(c.neighborhood)}.</p><p>${c.neighbors} other verified neighbor accounts are here. <a href="${SITE_URL}/people">Explore people and projects around you</a>.</p>${c.events.length?'<h2>Upcoming city events</h2><ul>'+c.events.map(e=>`<li><a href="${escapeHtml(e.href)}">${escapeHtml(e.title)}</a> — ${escapeHtml(e.date_label)}</li>`).join('')+'</ul>':'<p>Your city calendar is getting started. New listings will appear on the Events page as sources update.</p>'}<p><a href="${SITE_URL}/clans">Get your personal clan invite code</a> and invite people you know.</p><p><a href="${SITE_URL}/settings">Manage event emails and weekly digest</a></p>`};
    if(!job.payload){const {error:saveError}=await admin.from('welcome_mail_jobs').update({payload:body}).eq('user_id',job.user_id);if(saveError)continue;}
    try {
      const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`welcome/${job.user_id}`},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
      if(!res.ok)throw new Error(`Mail provider HTTP ${res.status}`);
      const {error:saveError}=await admin.from('welcome_mail_jobs').update({status:'sent',sent_at:new Date().toISOString(),lease_until:null,last_error:null}).eq('user_id',job.user_id);
      if(!saveError)sent++;
    } catch(e) {
      await admin.from('welcome_mail_jobs').update({status:job.attempts>=5?'failed':'pending',last_error:e instanceof Error?e.message:'Send failed',lease_until:null,due_at:new Date(Date.now()+3600000).toISOString()}).eq('user_id',job.user_id);
    }
  }
  return {sent,status:'ok'};
}
