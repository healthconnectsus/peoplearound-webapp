import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { MapShell } from "@/components/MapShell";
import { projectPinsByIds } from "@/lib/mapPins";
import { categoryMeta, STATE_META, type Project } from "@/lib/projects";
import { PlaybookList } from "@/components/PlaybookList";

function IdeaRow({
  p,
  stars,
  note,
}: {
  p: Project;
  stars: number;
  note?: string;
}) {
  const meta = STATE_META[p.state];
  return (
    <li>
      <Link
        href={`/projects/${p.id}`}
        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            <span className="mr-1.5" aria-hidden>
              {categoryMeta(p.category).emoji}
            </span>
            {p.title}
          </span>
          {note ? (
            <span className="block truncate text-xs text-black/45 dark:text-white/45">
              {note}
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

export default async function IdeasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: ownRows }, { data: memberRows }, { data: starRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "id,title,description,category,state,created_at,neighborhood:neighborhoods(name)"
        )
        .eq("owner_id", user.id)
        .neq("state", "archived")
        .order("created_at", { ascending: false }),
      supabase
        .from("memberships")
        .select(
          "project_id,status,project:projects(id,title,description,category,state,created_at,owner:profiles!projects_owner_id_fkey(display_name))"
        )
        .eq("user_id", user.id)
        .eq("status", "accepted"),
      supabase.from("stars").select("project_id"),
    ]);

  const own = (ownRows ?? []) as unknown as Project[];
  const joined = (
    (memberRows ?? []) as unknown as {
      project?: Project | null;
    }[]
  )
    .map((m) => m.project)
    .filter((p): p is Project => Boolean(p) && p!.state !== "archived");
  const stars = starRows ?? [];
  const starCount = (id: string) =>
    stars.filter((s) => s.project_id === id).length;

  // Your own corner of the map: the ideas you started and the teams you're
  // on, wherever they are.
  const pins = await projectPinsByIds(supabase, [
    ...own.map((p) => p.id),
    ...joined.map((p) => p.id),
  ]);

  return (
    <AppShell>
      <MapShell pins={pins}>
        <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-28 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">My ideas</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            The projects you started, and the teams you joined.
          </p>

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
              Started by you · {own.length}
            </h2>
            {own.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {own.map((p) => (
                  <IdeaRow
                    key={p.id}
                    p={p}
                    stars={starCount(p.id)}
                    note={p.neighborhood?.name}
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center dark:border-white/15 dark:bg-zinc-900">
                <p className="text-3xl" aria-hidden>
                  💡
                </p>
                <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                  You haven&apos;t shared an idea yet. Big or small — the people
                  around you can&apos;t help with what they can&apos;t see.
                </p>
                <Link
                  href="/projects/new"
                  className="mt-4 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Share your first idea
                </Link>
                <p className="mt-3 text-xs text-black/45 dark:text-white/45">
                  Not sure what?{" "}
                  <a href="#playbooks" className="underline">
                    Start from a playbook
                  </a>{" "}
                  below.
                </p>
              </div>
            )}
          </section>

          {joined.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                Teams you joined · {joined.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {joined.map((p) => (
                  <IdeaRow
                    key={p.id}
                    p={p}
                    stars={starCount(p.id)}
                    note={`Started by ${p.owner?.display_name ?? "a neighbor"}`}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <PlaybookList />
        </main>
      </MapShell>
    </AppShell>
  );
}
