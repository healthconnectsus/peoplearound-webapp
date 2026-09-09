'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdministrator } from '@/lib/admin';
import { SITE_URL } from '@/lib/site';
export async function selectAdminCity(form: FormData) {
  const { admin } = await requireAdministrator();
  const id = String(form.get('cityId') ?? '');
  const { data } = await admin.from('event_cities').select('id').eq('id', id).maybeSingle();
  if (!data) redirect('/admin?error=Choose+a+city');
  (await cookies()).set('pa-admin-city', id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
  redirect(`/admin/city?city=${id}`);
}
export async function createAdminCity(form: FormData) {
  const { admin, user } = await requireAdministrator();
  const city = String(form.get('city') ?? '').trim().slice(0, 80);
  const community = String(form.get('community') ?? '').trim().slice(0, 80);
  if (!city || !community) redirect('/admin?error=City+and+community+names+are+required');
  const { data, error } = await admin.from('neighborhoods').insert({ name: community, city, kind: 'neighborhood', created_by: user.id }).select('id').single();
  if (error || !data) redirect('/admin?error=Could+not+create+city.+Community+names+must+be+unique');
  revalidatePath('/admin'); redirect('/admin?message=City+created+with+four+clearly+labeled+demo+residents');
}
export async function generateDemoResidents(form: FormData) {
  const { admin } = await requireAdministrator();
  const { error } = await admin.rpc('seed_demo_residents', { p_city: String(form.get('cityId') ?? ''), p_count: 8 });
  if (error) redirect('/admin?error=Could+not+generate+demo+residents');
  revalidatePath('/admin'); redirect('/admin?message=Demo+residents+created.+They+are+labeled+and+do+not+count+as+real+members');
}
export async function inviteRealResident(form: FormData) {
  const { admin } = await requireAdministrator();
  const email = String(form.get('email') ?? '').trim();
  const hood = String(form.get('communityId') ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/admin?error=Enter+a+valid+email');
  const { data: community } = await admin.from('neighborhoods').select('id').eq('id', hood).maybeSingle();
  if (!community) redirect('/admin?error=Choose+a+community');
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/auth/confirm` });
  if (error || !data.user) redirect('/admin?error=Invitation+could+not+be+sent.+The+email+may+already+have+an+account');
  const { error: assignError } = await admin.from('profiles').update({ neighborhood_id: hood }).eq('id', data.user.id);
  if (assignError) redirect('/admin?error=Invitation+sent,+but+community+assignment+failed');
  await admin.from('community_members').upsert({ community_id: hood, user_id: data.user.id }, { onConflict: 'community_id,user_id', ignoreDuplicates: true });
  revalidatePath('/admin'); redirect('/admin?message=Invitation+sent.+The+person+must+accept+to+activate+their+account');
}
