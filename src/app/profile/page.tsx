import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import {
  categoryMeta,
  initials,
  STATE_META,
  type Project,
} from "@/lib/projects";

function ProjectRow({ p, stars }: { p: Project; stars: number }) {
  const meta = STATE_META[p.state];
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-zinc-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            <span className="mr-1.5" aria-hidden>
              {categoryMeta(p.category).emoji}
            </span>
            {p.title}
          </span>
          {p.owner?.display_name ? (
            <span className="block truncate text-xs text-black/45 dark:text-white/45">
              by {p.owner.display_name}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-black/45 dark:text-white/45">
          ⭐ {stars}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          {meta.label}
        </span>
      </Link>
    </li>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileRow }, { data: ownRows }, { data: starRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,created_at,neighborhood:neighborhoods(name,city)")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("projects")
        .select(
          "id,title,category,state,created_at,owner:profiles!projects_owner_id_fkey(display_name)",
        )
        .eq("owner_id", user.id)
        .neq("state", "archived")
        .order("created_at", { ascending: false }),
      supabase.from("stars").select("project_id,user_id"),
    ]);

  const profile = profileRow as unknown as {
    display_name: string | null;
    created_at: string;
    neighborhood?: { name: string; city: string | null } | null;
  } | null;
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Neighbor";
  const own = (ownRows ?? []) as unknown as Project[];
  const stars = starRows ?? [];
  const starCount = (id: string) =>
    stars.filter((s) => s.project_id === id).length;

  // Projects this user starred = their Faves.
  const myStarredIds = stars
    .filter((s) => s.user_id === user.id)
    .map((s) => s.project_id);
  const { data: favedRows } = myStarredIds.length
    ? await supabase
        .from("projects")
        .select(
          "id,title,category,state,created_at,owner:profiles!projects_owner_id_fkey(display_name)",
        )
        .in("id", myStarredIds)
        .neq("state", "archived")
    : { data: [] };
  const faves = (favedRows ?? []) as unknown as Project[];

  const [{ count: teamsJoined }, { count: helpConfirmed }] = await Promise.all([
    supabase
      .from("memberships")
      .select("project_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "accepted"),
    supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("contributor_id", user.id)
      .not("confirmed_at", "is", null),
  ]);

  const starsReceived = own.reduce((sum, p) => sum + starCount(p.id), 0);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;
  const hood = profile?.neighborhood
    ? profile.neighborhood.city
      ? `${profile.neighborhood.name} (${profile.neighborhood.city})`
      : profile.neighborhood.name
    : null;

  const dashboard = [
    { label: "Ideas shared", value: own.length },
    { label: "Stars received", value: starsReceived },
    { label: "Teams joined", value: teamsJoined ?? 0 },
    { label: "Help confirmed", value: helpConfirmed ?? 0 },
  ];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 lg:py-6">
        {/* Profile header */}
        <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900">
          <div className="h-24 bg-gradient-to-r from-emerald-100 via-sky-100 to-violet-100 dark:from-emerald-950 dark:via-sky-950 dark:to-violet-950" />
          <div className="px-6 pb-6">
            <div className="-mt-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-2xl font-semibold text-emerald-800 dark:border-zinc-900 dark:bg-emerald-900 dark:text-emerald-200">
              {initials(name)}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {name}
            </h1>
            <div className="mt-1.5 flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
              {hood ? <p>📍 {hood}</p> : null}
              {memberSince ? <p>🌱 Member since {memberSince}</p> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/settings"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-white/80"
              >
                Edit profile
              </Link>
              <Link
                href="/projects/new"
                className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Share an idea
              </Link>
            </div>
          </div>
        </section>

        {/* Dashboard — private stats */}
        <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Dashboard</h2>
            <span className="text-xs text-black/40 dark:text-white/40">
              Only visible to you
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {dashboard.map((d) => (
              <div
                key={d.label}
                className="rounded-xl bg-stone-50 p-3 text-center dark:bg-zinc-800"
              >
                <p className="text-2xl font-semibold">{d.value}</p>
                <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                  {d.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Faves */}
        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              Faves · {faves.length}
            </h2>
            <Link
              href="/faves"
              className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
            >
              See all Local Faves
            </Link>
          </div>
          {faves.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {faves.map((p) => (
                <ProjectRow key={p.id} p={p} stars={starCount(p.id)} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
              Projects you star show up here.
            </p>
          )}
        </section>

        {/* Groups */}
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            Groups
          </h2>
          <div className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm dark:border-white/5 dark:bg-zinc-900">
            <p className="font-medium">No groups yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-black/60 dark:text-white/60">
              Gardening club? Pickup football? Groups are coming soon — until
              then, every project has a team.
            </p>
            <Link
              href="/groups"
              className="mt-4 inline-block rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              👥 Explore groups
            </Link>
          </div>
        </section>

        {/* Ideas (posts) */}
        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              Ideas · {own.length}
            </h2>
            <Link
              href="/ideas"
              className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
            >
              See all
            </Link>
          </div>
          {own.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {own.map((p) => (
                <ProjectRow key={p.id} p={p} stars={starCount(p.id)} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
              You haven&apos;t shared an idea yet —{" "}
              <Link href="/projects/new" className="underline">
                start your first
              </Link>
              .
            </p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
