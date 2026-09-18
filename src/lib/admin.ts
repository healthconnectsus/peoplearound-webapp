import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { currentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
export async function requireAdministrator() {
  const client = await createClient();
  const user = await currentUser();
  if (!user) redirect('/login');
  const { data } = await client.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!data?.is_admin) notFound();
  const admin = createAdminClient();
  if (!admin) throw new Error('Service role is not configured');
  return { admin, user };
}
