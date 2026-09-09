import { createClient } from '@/lib/supabase/server';
export async function DemoResidents() {
  const client = await createClient();
  const { data } = await client.from('demo_residents').select('id,display_name,bio').order('slot').limit(8);
  if (!data?.length) return null;
  return <section className="my-6 rounded-xl border border-dashed border-slate-400 p-4"><h2 className="font-bold">Explore with demo residents</h2><p className="mt-1 text-sm">These are example profiles, not real people. Invite your neighbors to build the real community.</p><ul className="mt-3 grid grid-cols-2 gap-2">{data.map(d => <li key={d.id} className="rounded border p-2 text-sm">{d.display_name}<span className="block text-xs">Demo profile · cannot be messaged</span></li>)}</ul></section>;
}
