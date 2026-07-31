import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { initials } from "@/lib/projects";

type Connection = {
  id: string;
  name: string;
  sharedProjects: string[];
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Projects where I am the founder…
  const { data: ownRows } = await supabase
    .from("projects")
    .select("id,title")
    .eq("owner_id", user.id);
  // …and projects whose team I joined.
  const { data: myMemberships } = await supabase
    .from("memberships")
    .select(
      "project_id,project:projects(id,title,owner_id,owner:profiles!projects_owner_id_fkey(id,display_name))",
    )
    .eq("user_id", user.id)
    .eq("status", "accepted");

  type JoinedProject = {
    id: string;
    title: string;
    owner_id: string;
    owner?: { id: string; display_name: string | null } | null;
  };
  const own = (ownRows ?? []) as { id: string; title: string }[];
  const joined = (
    (myMemberships ?? []) as unknown as { project?: JoinedProject | null }[]
  )
    .map((m) => m.project)
    .filter((p): p is JoinedProject => Boolean(p));

  const allProjectIds = [...own.map((p) => p.id), ...joined.map((p) => p.id)];
  const titleById = new Map<string, string>([
    ...own.map((p) => [p.id, p.title] as const),
    ...joined.map((p) => [p.id, p.title] as const),
  ]);

  // Everyone on those teams is a connection.
  const connections = new Map<string, Connection>();
  const add = (id: string, name: string | null, projectId: string) => {
    if (id === user.id) return;
    const existing = connections.get(id);
    const title = titleById.get(projectId);
    if (existing) {
      if (title && !existing.sharedProjects.includes(title)) {
        existing.sharedProjects.push(title);
      }
    } else {
      connections.set(id, {
        id,
        name: name ?? "A neighbor",
        sharedProjects: title ? [title] : [],
      });
    }
  };

  if (allProjectIds.length > 0) {
    const { data: teamRows } = await supabase
      .from("memberships")
      .select("project_id,user_id,profile:profiles(id,display_name)")
      .in("project_id", allProjectIds)
      .eq("status", "accepted");
    for (const row of (teamRows ?? []) as unknown as {
      project_id: string;
      user_id: string;
      profile?: { id: string; display_name: string | null } | null;
    }[]) {
      add(row.user_id, row.profile?.display_name ?? null, row.project_id);
    }
  }
  // Founders of the teams I joined count too.
  for (const p of joined) {
    add(p.owner_id, p.owner?.display_name ?? null, p.id);
  }

  const list = [...connections.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 lg:py-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          My connections
        </h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          People you&apos;ve built something with — teammates from your
          projects and the teams you joined.
        </p>

        {list.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center dark:border-white/15 dark:bg-zinc-900">
            <p className="text-3xl" aria-hidden>
              🤝
            </p>
            <p className="mt-3 font-medium">No connections yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
              Connections form when people build together. Welcome someone onto
              your project, or ask to join one nearby.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Browse projects
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {list.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-zinc-900"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  {c.sharedProjects.length > 0 ? (
                    <p className="truncate text-xs text-black/50 dark:text-white/50">
                      {c.sharedProjects.join(" · ")}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/chats?to=${c.id}`}
                  className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Message
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
