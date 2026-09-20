import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";
import { MapShell } from "@/components/MapShell";
import { projectPinsByIds } from "@/lib/mapPins";
import { categoryMeta, STATE_META, type Project } from "@/lib/projects";

export const metadata = { title: "Local Faves" };

/** Local Faves — the L in the rail's P·E·O·P·L·E. */
async function FavesPage() {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) redirect("/login");

  // Ranked and cut to twenty in Postgres (migration 0063). This page used to
  // read every non-archived project and every star row, join them in memory,
  // sort, and keep twenty — two unbounded reads to render a list that has a
  // hard limit printed on it.
  const { data } = await supabase.rpc("top_faves", { p_limit: 20 });
  const faves = (data ?? []) as unknown as (Project & { stars: number })[];

  const pins = await projectPinsByIds(supabase, faves.map((p) => p.id));
  return (
    <>
      <MapShell pins={pins}>
        <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Local Faves</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            The projects your neighbors would most love to see exist, ranked by
            stars.
          </p>

          {faves.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-400 bg-white p-10 text-center dark:border-slate-500 dark:bg-zinc-900">
              <p className="text-3xl" aria-hidden>
                ⭐
              </p>
              <p className="mt-3 font-medium">No starred projects yet</p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Star the ideas you would love to exist — the favorites of your
                neighborhood show up here.
              </p>
            </div>
          ) : (
            <ol className="mt-6 flex flex-col gap-2">
              {faves.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600 dark:bg-zinc-900"
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
        </main>
      </MapShell>
    </>
  );
}

/**
 * The frame first, the content when it's ready.
 *
 * The shell streams at the first byte with a skeleton where the body will
 * land, and the body follows when its reads answer. The page used to hold
 * the whole document until the last query came back.
 */
export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <FavesPage />
      </Suspense>
    </AppShell>
  );
}
