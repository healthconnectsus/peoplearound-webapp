import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { requireAdministrator } from '@/lib/admin';
export const metadata = { title: 'City overview' };
export default async function AdminCityPage({ searchParams }: { searchParams: Promise<{city?:string}> }) {
  const { admin } = await requireAdministrator();
  const { city:id } = await searchParams;
  if (!id) notFound();
  const { data: city } = await admin.from('event_cities').select('id,name,city_key').eq('id',id).maybeSingle();
  if (!city) notFound();
  const { data: allHoods } = await admin.from('neighborhoods').select('id,name,city').limit(1000);
  const hoods = (allHoods ?? []).filter(h => h.city?.trim().toLowerCase().replace(/\s+/g,' ') === city.city_key);
  const ids = hoods.map(h => h.id);
  const [{data: people},{data: events},{data: demos}] = await Promise.all([
    ids.length ? admin.from('profiles').select('id,display_name').in('neighborhood_id',ids).limit(200) : Promise.resolve({data:[]}),
    admin.from('city_events').select('id,title,date_label,source_url').eq('city_id',id).gte('event_date',new Date().toISOString().slice(0,10)).gt('expires_at',new Date().toISOString()).neq('status','cancelled').order('event_date').limit(50),
    admin.from('demo_residents').select('id,display_name').eq('city_id',id),
  ]);
  return <AppShell><main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8"><h1 className="text-3xl font-bold">{city.name}</h1><p className="mt-2 text-sm">Admin city view. Your own home community stays unchanged.</p>
    <h2 className="mt-6 text-xl font-bold">Communities</h2><ul>{hoods.map(h => <li key={h.id}><Link className="underline" href={`/admin/activity?community=${h.id}`}>{h.name} — view activity</Link></li>)}</ul>
    <h2 className="mt-6 text-xl font-bold">Registered residents</h2><ul>{people?.map(p => <li key={p.id}><Link className="underline" href={`/admin/activity?user=${p.id}`}>{p.display_name ?? 'Neighbor'} — view activity</Link></li>)}</ul>
    <h2 className="mt-6 text-xl font-bold">Demo residents — not real people</h2><ul>{demos?.map(d => <li key={d.id}>{d.display_name}</li>)}</ul>
    <h2 className="mt-6 text-xl font-bold">Imported events</h2><ul className="space-y-2">{events?.map(e => <li key={e.id}><a href={e.source_url} target="_blank" rel="noopener noreferrer" className="underline">{e.title}</a><p className="text-xs">{e.date_label}</p></li>)}</ul>
  </main></AppShell>;
}
