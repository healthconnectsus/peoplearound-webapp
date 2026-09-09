import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { selectAdminCity } from '@/app/admin/cityActions';
import { SubmitButton } from './SubmitButton';
export async function AdminCityPicker({ id = 'admin-city-desktop' }: { id?: string }) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from('event_cities').select('id,name').order('name').limit(500);
  if (!data?.length) return null;
  const selectedCity = (await cookies()).get('pa-admin-city')?.value ?? '';
  return <form action={selectAdminCity} className="flex items-center gap-1">
    <label className="sr-only" htmlFor={id}>View city as admin</label>
    <select id={id} name="cityId" defaultValue={selectedCity} className="max-w-40 rounded border border-slate-400 bg-white px-2 py-2 text-xs dark:bg-zinc-900">
      <option value="" disabled>View a city…</option>{data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    <SubmitButton pendingLabel="…" className="rounded border border-slate-400 px-2 py-2 text-xs">Go</SubmitButton>
  </form>;
}
