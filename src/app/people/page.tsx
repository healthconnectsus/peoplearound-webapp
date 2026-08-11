import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { groupPins, nearbyProjectPins, peopleClusterPins } from "@/lib/mapPins";
import { initials } from "@/lib/projects";
import { FavesList } from "@/components/FavesList";

type PersonRow = {
  id: string;
  display_name: string | null;
  created_at: string;
};

function PersonCard({
  person,
  badge,
}: {
  person: PersonRow;
  badge?: string;
}) {
  const name = person.display_name ?? "A neighbor";
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-zinc-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        {badge ? (
          <p className="text-xs text-black/50 dark:text-white/50">{badge}</p>
        ) : null}
      </div>
      {badge !== "You" ? (
        <Link
          href={`/chats?to=${person.id}`}
          className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Message
        </Link>
      ) : null}
    </li>
  );
}

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "neighborhood_id,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name)",
    )
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as unknown as {
    neighborhood_id: string | null;
    neighborhood?: { name: string } | null;
  } | null;
  if (!profile?.neighborhood_id) redirect("/neighborhood");
  const hoodName = profile.neighborhood?.name ?? "your neighborhood";

  const [{ data: neighborRows }, { data: remoteProjectRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,created_at")
        .eq("neighborhood_id", profile.neighborhood_id)
        .order("created_at", { ascending: true })
        .limit(100),
      // People offering skills that work from anywhere = owners of projects
      // that welcome online help.
      supabase
        .from("projects")
        .select("owner_id,help,owner:profiles!projects_owner_id_fkey(id,display_name,created_at)")
        .in("help", ["remote", "both"])
        .neq("state", "archived"),
    ]);

  const neighbors = (neighborRows ?? []) as PersonRow[];
  const remoteOwners = new Map<string, PersonRow>();
  for (const row of (remoteProjectRows ?? []) as unknown as {
    owner_id: string;
    owner?: PersonRow | null;
  }[]) {
    if (row.owner && !remoteOwners.has(row.owner_id)) {
      remoteOwners.set(row.owner_id, row.owner);
    }
  }
  const remoteHelpers = [...remoteOwners.values()].filter(
    (p) => !neighbors.some((n) => n.id === p.id),
  );

  // People are pinned as COMMUNITY clusters with headcounts — never at
  // anyone's home (see lib/mapPins.ts).
  // Groups (communities that aren't a plain neighborhood) live on this page
  // too — a group IS people, and a separate tab for it was a distinction the
  // user had to hold rather than one the product earned.
  const [clusters, gPins] = await Promise.all([
    peopleClusterPins(supabase),
    groupPins(supabase),
  ]);
  const located = [...clusters, ...gPins];
  const pins = located.length
    ? located
    : await nearbyProjectPins(supabase, user.id);
  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-6 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">People around</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            The neighbors near you, what they&rsquo;ve starred, the groups they
            form, and people further away who are open to helping online.
          </p>

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              In {hoodName} · {neighbors.length}
            </h2>
            {neighbors.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {neighbors.map((p) => (
                  <PersonCard
                    key={p.id}
                    person={p}
                    badge={p.id === user.id ? "You" : undefined}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
                No neighbors here yet —{" "}
                <Link href="/invite" className="underline">
                  invite some
                </Link>
                .
              </p>
            )}
          </section>

          {remoteHelpers.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                💻 Open to helping online
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {remoteHelpers.map((p) => (
                  <PersonCard key={p.id} person={p} badge="Welcomes online help" />
                ))}
              </ul>
            </section>
          ) : null}
          <FavesList />

          <section id="groups" className="mt-10 scroll-mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              👥 Groups
            </h2>
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center dark:border-white/15 dark:bg-zinc-900">
              <p className="text-3xl" aria-hidden>
                👥
              </p>
              <p className="mt-3 font-medium">Groups are coming soon</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
                Lasting circles of neighbors — gardeners, runners, makers — that
                outlive any single project. Until then, every project already has
                a team you can join.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Browse projects
              </Link>
            </div>
          </section>
        </main>
      </MapShell>
    </AppShell>
  );
}
