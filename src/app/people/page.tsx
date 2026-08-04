import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { initials } from "@/lib/projects";

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

  return (
    <AppShell>
      <main className="w-full max-w-2xl flex-1 p-4 lg:px-8 lg:py-6">
        <h1 className="text-2xl font-semibold tracking-tight">People around</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          The neighbors near you, and people further away who are open to
          helping online.
        </p>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
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
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              💻 Open to helping online
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {remoteHelpers.map((p) => (
                <PersonCard key={p.id} person={p} badge="Welcomes online help" />
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
