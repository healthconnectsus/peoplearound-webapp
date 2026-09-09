'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
export async function joinClan(form:FormData) {
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser(); if(!user) redirect('/login');
  const code=String(form.get('code')??'').trim().toLowerCase();
  if(!/^[a-f0-9]{32}$/.test(code)) redirect('/clans?error=Enter+a+valid+clan+code');
  const {error}=await client.rpc('join_clan',{p_code:code});
  if(error) redirect('/clans?error=Clan+not+found+or+joining+is+unavailable');
  (await cookies()).delete('pa-clan'); revalidatePath('/clans'); redirect('/clans?message=Joined+the+clan');
}
export async function renameClan(form:FormData) {
  const client=await createClient(); const {data:{user}}=await client.auth.getUser(); if(!user)redirect('/login');
  const name=String(form.get('name')??'').trim().slice(0,80); if(!name)redirect('/clans');
  const {error}=await client.from('clans').update({name}).eq('owner_id',user.id);
  if(error)redirect('/clans?error=Could+not+rename+clan');
  revalidatePath('/clans');redirect('/clans');
}
export async function leaveClan(form:FormData) {
  const client=await createClient(); const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login');
  await client.from('clan_members').delete().eq('clan_id',String(form.get('clanId')??'')).eq('user_id',user.id);
  revalidatePath('/clans');redirect('/clans');
}
export async function dismissClanInvite() { (await cookies()).delete('pa-clan'); redirect('/people'); }
