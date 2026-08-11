import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta, STATE_META, type Project } from "@/lib/projects";

/**
 * Local Faves, rendered inside "People around" — what your neighbors starred
 * IS a fact about the people around you, so it earned a section rather than
 * a rail of its own.
 */
export async function FavesList() {
  const supabase = await createClient();

  const [{ data: projectRows }, { data: starRows }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,title,description,category,state,neighborhood_id,created_at,owner:profiles!projects_owner_id_fkey(display_name),neighborhood:neighborhoods(name,city)",
      )
      .neq("state", "archived"),
    supabase.from("stars").select("project_id"),
  ]);

  const projects = (projectRows ?? []) as unknown as Project[];
  const stars = starRows ?? [];
  const starCount = (id: string) =>
    stars.filter((s) => s.project_id === id).length;

  const faves = projects
    .map((p) => ({ ...p, stars: starCount(p.id) }))
    .filter((p) => p.stars > 0)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 10);

  return (
    <section id="faves" className="mt-10 scroll-mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
        ⭐ Local Faves
      </h2>
      <p className="mb-3 text-sm text-black/50 dark:text-white/50">
        The ideas your neighbors would most love to see exist, ranked by stars.
      </p>

      {faves.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/60 dark:border-white/15 dark:bg-zinc-900 dark:text-white/60">
          Nothing starred yet. Star the ideas you would love to exist — the
          neighborhood&rsquo;s favorites show up here.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {faves.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-zinc-900"
              >
                <span className="w-6 shrink-0 text-center text-sm font-semibold text-black/40 dark:text-white/40">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    <span className="mr-1.5" aria-hidden>
                      {categoryMeta(p.category).emoji}
                    </span>
                    {p.title}
                  </span>
                  <span className="block truncate text-xs text-black/45 dark:text-white/45">
                    {p.owner?.display_name ?? "Someone"} ·{" "}
                    {STATE_META[p.state].label}
                    {p.neighborhood?.name ? ` · ${p.neighborhood.name}` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  ⭐ {p.stars}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
