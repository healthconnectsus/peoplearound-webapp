import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { requireAdministrator } from '@/lib/admin';
export const metadata = { title: 'Activity reports' };
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ user?: string; community?: string; q?: string }> }) {
  const { admin } = await requireAdministrator();
  const params = await searchParams;
  const uuid = (s?: string) => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
  const user = uuid(params.user), community = uuid(params.community);
  let people = admin.from('profiles').select('id,display_name').order('display_name').limit(500);
  if (params.q) people = people.ilike('display_name', `%${params.q.slice(0,80)}%`);
  const [{ data: users }, { data: hoods }, report] = await Promise.all([
    people, admin.from('neighborhoods').select('id,name,city').order('name').limit(500),
    user || community ? admin.rpc('admin_activity', { p_user: user, p_community: community }) : Promise.resolve({ data: null, error: null }),
  ]);
  const data = report.data as { totals: Record<string,number>; entries: { id:string;kind:string;title:string;created_at:string;href:string;actor:string|null }[] } | null;
  return <AppShell><main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
    <h1 className="text-3xl font-bold">Activity reports</h1><Link href="/admin" className="text-sm underline">Back to admin</Link>
    <form className="mt-5 flex flex-wrap gap-2">
      <input name="q" placeholder="Filter user names" defaultValue={params.q} aria-label="Filter user names" className="rounded border bg-transparent p-2" />
      <select name="user" defaultValue={user ?? ''} aria-label="User" className="max-w-full rounded border bg-white p-2 dark:bg-zinc-900"><option value="">All users</option>{users?.map(u => <option key={u.id} value={u.id}>{u.display_name ?? u.id}</option>)}</select>
      <select name="community" defaultValue={community ?? ''} aria-label="Community" className="max-w-full rounded border bg-white p-2 dark:bg-zinc-900"><option value="">All communities</option>{hoods?.map(h => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}</select>
      <button className="rounded border p-2">Show activity</button>
    </form>
    <p className="mt-3 text-sm text-black/60 dark:text-white/60">Select a user, a community, or both. Counts cover stored posts; the list shows the latest 100. Older events may have no recorded creator and are only included in community reports.</p>
    {report.error && <p role="alert" className="mt-4 text-red-600">Reports need migration 0047.</p>}
    {data && <><div className="mt-5 grid grid-cols-3 gap-3">{['project','event','small help','offer','update','contribution'].map(k => <div key={k} className="rounded border p-3"><strong className="block text-xl">{data.totals[k] ?? 0}</strong>{k}</div>)}</div>
      <ul className="mt-5 space-y-2">{data.entries.map(e => <li key={`${e.kind}-${e.id}`} className="rounded border p-3"><Link href={e.href} className="font-semibold underline">{e.title}</Link><p className="text-xs">{e.kind} · {new Date(e.created_at).toLocaleString('en-US',{timeZone:'UTC'})} UTC {e.actor ? <Link href={`/admin/activity?user=${e.actor}`} className="underline"> · inspect author</Link> : ' · creator not recorded'}</p></li>)}</ul>
      {!data.entries.length && <p className="mt-4">No activity matching this selection.</p>}</>}
  </main></AppShell>;
}
