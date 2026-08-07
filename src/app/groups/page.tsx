import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { groupPins, nearbyProjectPins } from "@/lib/mapPins";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Groups are communities that aren't a plain neighborhood; pin them at
  // their centres, falling back to nearby projects while none exist yet.
  const gPins = await groupPins(supabase);
  const pins = gPins.length ? gPins : await nearbyProjectPins(supabase, user.id);
  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-16 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Groups</h1>
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center dark:border-white/15 dark:bg-zinc-900">
            <p className="text-3xl" aria-hidden>
              👥
            </p>
            <p className="mt-3 font-medium">Groups are coming soon</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
              Lasting circles of neighbors — gardeners, runners, makers — that
              outlive any single project. Until then, every project already has a
              team you can join.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Browse projects
            </Link>
          </div>
        </main>
      </MapShell>
    </AppShell>
  );
}
