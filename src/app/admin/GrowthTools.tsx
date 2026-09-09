import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { SubmitButton } from '@/components/SubmitButton';
import { createAdminCity, generateDemoResidents, inviteRealResident } from './cityActions';
const input = 'rounded border border-slate-400 bg-transparent px-3 py-2 text-sm';
export async function GrowthTools() {
  const admin = createAdminClient();
  if (!admin) return null;
  const [{ data: cities }, { data: communities }] = await Promise.all([
    admin.from('event_cities').select('id,name').order('name').limit(500),
    admin.from('neighborhoods').select('id,name,city').order('name').limit(500),
  ]);
  return <section className="mt-8 space-y-5 rounded-2xl border border-slate-300 p-5 dark:border-slate-600">
    <h2 className="text-lg font-bold">Cities and residents</h2>
    <Link href="/admin/activity" className="text-sm underline">Inspect a user or community’s activity →</Link>
    <form action={createAdminCity} className="flex flex-wrap gap-2">
      <input required name="city" placeholder="City (include state)" aria-label="New city" maxLength={80} className={input} />
      <input required name="community" placeholder="Unique community name" aria-label="Community name" maxLength={80} className={input} />
      <SubmitButton pendingLabel="Creating…" className={input}>Create city</SubmitButton>
    </form>
    <p className="text-xs text-black/60 dark:text-white/60">New cities get four labeled demo residents. Demo residents cannot log in, message, or count as real neighbors.</p>
    <form action={generateDemoResidents} className="flex flex-wrap gap-2">
      <select required name="cityId" aria-label="City for demo residents" className={input}>{cities?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <SubmitButton pendingLabel="Generating…" className={input}>Generate up to 8 demo residents</SubmitButton>
    </form>
    <h3 className="font-semibold">Invite a real resident</h3>
    <form action={inviteRealResident} className="flex flex-wrap gap-2">
      <input required type="email" name="email" placeholder="Their email address" aria-label="Invitee email" className={input} />
      <select required name="communityId" aria-label="Invitee community" className={input}>{communities?.map(c => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}</select>
      <SubmitButton pendingLabel="Sending invitation…" className={input}>Send invitation email</SubmitButton>
    </form>
    <p className="text-xs text-black/60 dark:text-white/60">This sends one invitation. The person verifies their email and activates the account themselves.</p>
  </section>;
}
