import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * The index the city pages never had.
 *
 * `/city/[slug]` was built so a council officer, a librarian or a local
 * reporter could see what a place is building without an account — but the
 * only way to reach one was to be sent the URL by hand. A `sitemap.xml` fixed
 * that for crawlers; this fixes it for people, which is the half that
 * actually matters when someone forwards the link to a colleague.
 *
 * Same source as the individual pages: `public_cities` (migration 0043), an
 * anon-safe view that can only ever return counts. No neighbor is named here,
 * and nothing on this page requires an account to read.
 */

type CityRow = {
  city: string;
  slug: string;
  communities: number;
  projects: number;
  neighbors: number;
};

export const metadata: Metadata = {
  title: "Where Peoplearound is being built",
  description:
    "Every city with neighbors starting things on Peoplearound, with counts of projects, communities and neighbors.",
};

// Counts move slowly and this page is public, so it can be cached rather than
// re-queried for every visitor.
export const revalidate = 3600;

export default async function CityIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_cities")
    .select("city,slug,communities,projects,neighbors")
    .limit(500);

  // Busiest first — this is a directory, not a ranking of people, and the
  // thing a visitor is looking for is "is anything happening near me".
  const cities = ((data ?? []) as CityRow[])
    .filter((c) => c.slug)
    .sort((a, b) => b.projects - a.projects || a.city.localeCompare(b.city));

  const totals = cities.reduce(
    (acc, c) => ({
      projects: acc.projects + c.projects,
      communities: acc.communities + c.communities,
      neighbors: acc.neighbors + c.neighbors,
    }),
    { projects: 0, communities: 0, neighbors: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:py-16">
      <Link
        href="/"
        className="text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Peoplearound
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight lg:text-4xl">
        Where Peoplearound is being built
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/60 dark:text-white/60">
        Every city where neighbors have started something. These pages count
        what is under way and never name a neighbor.
      </p>

      {cities.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-400 p-6 text-center text-sm text-black/55 dark:border-slate-500 dark:text-white/55">
          Nothing to show here yet. The first neighborhood to start something
          will appear on this page.
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-black/55 dark:text-white/55">
            {totals.projects} {totals.projects === 1 ? "project" : "projects"}{" "}
            across {cities.length} {cities.length === 1 ? "city" : "cities"}.
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/city/${c.slug}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-4 py-3 transition-colors hover:bg-black/[0.03] dark:border-slate-600 dark:bg-zinc-900 dark:hover:bg-white/5"
                >
                  <span className="min-w-0 font-medium">{c.city}</span>
                  <span className="shrink-0 text-sm tabular-nums text-black/55 dark:text-white/55">
                    {c.projects} {c.projects === 1 ? "project" : "projects"} ·{" "}
                    {c.neighbors}{" "}
                    {c.neighbors === 1 ? "neighbor" : "neighbors"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="mt-12 rounded-2xl border border-slate-300 bg-white p-6 text-center dark:border-slate-600 dark:bg-zinc-900">
        <p className="font-medium">Your city not here?</p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          It appears the moment someone starts the first thing. That someone
          can be you.
        </p>
        <Link
          href="/login#join"
          className="mt-4 inline-block rounded-lg bg-pa-brand px-6 py-2.5 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
        >
          Join Peoplearound
        </Link>
      </section>
    </main>
  );
}
