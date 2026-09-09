import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { SubmitButton } from '@/components/SubmitButton';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/site';
import { joinClan,renameClan,leaveClan,dismissClanInvite } from './actions';
export const metadata={title:'Your clans'};
export default async function ClansPage({searchParams}:{searchParams:Promise<{clan?:string;error?:string;message?:string}>}) {
  const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login');
  const params=await searchParams;const incoming=params.clan??(await cookies()).get('pa-clan')?.value??'';
  const {data:clans,error}=await client.from('clans').select('id,name,owner_id,invite_code').order('created_at');
  const {data:members}=await client.from('clan_members').select('clan_id,user_id,profile:profiles(display_name)').limit(500);
  const mine=clans?.find(c=>c.owner_id===user.id); const input='rounded border border-slate-400 bg-transparent px-3 py-2 text-sm';
  return <AppShell><main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8"><h1 className="text-3xl font-bold">Your clans</h1><p className="mt-2 text-sm">Your own circle of people to invite and build with. Clan membership does not change your home community or grant access to private projects.</p>
    {error&&<p className="mt-4">Clans need migration 0046.</p>}{params.error&&<p role="alert" className="mt-4 text-red-600">{params.error}</p>}{params.message&&<p role="status" className="mt-4">{params.message}</p>}
    {mine&&<section className="mt-6 rounded-xl border p-4"><h2 className="text-xl font-bold">{mine.name}</h2><form action={renameClan} className="mt-3 flex gap-2"><input name="name" aria-label="Your clan name" defaultValue={mine.name} maxLength={80} required className={input}/><SubmitButton pendingLabel="Saving…" className={input}>Rename</SubmitButton></form>
      <label className="mt-4 block text-sm">Your clan code<input readOnly value={mine.invite_code} className={`${input} mt-1 block w-full`} /></label>
      <label className="mt-3 block text-sm">Share this invitation link<input readOnly value={`${SITE_URL}/clans?clan=${mine.invite_code}`} className={`${input} mt-1 block w-full`} /></label>
    </section>}
    <form action={joinClan} className="mt-6 flex flex-wrap gap-2"><input name="code" aria-label="Clan invitation code" defaultValue={incoming} placeholder="Enter a clan code" required maxLength={32} className={input}/><SubmitButton pendingLabel="Joining…" className={input}>Join this clan</SubmitButton></form>
    {incoming&&<form action={dismissClanInvite}><button className="mt-2 text-sm underline">Skip this invitation</button></form>}
    <ul className="mt-6 space-y-4">{clans?.map(c=><li key={c.id} className="rounded-xl border p-4"><h2 className="font-bold">{c.name}{c.owner_id===user.id?' · Your clan':''}</h2><ul className="mt-2 text-sm">{(members as unknown as {clan_id:string;user_id:string;profile:{display_name:string|null}|null}[]??[]).filter(m=>m.clan_id===c.id).map(m=><li key={m.user_id}>{m.profile?.display_name??'Neighbor'}</li>)}</ul>{c.owner_id!==user.id&&<form action={leaveClan}><input type="hidden" name="clanId" value={c.id}/><SubmitButton pendingLabel="Leaving…" className="mt-3 text-sm underline">Leave clan</SubmitButton></form>}</li>)}</ul>
  </main></AppShell>;
}
