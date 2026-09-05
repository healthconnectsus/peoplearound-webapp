import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_META, STATE_META } from "@/lib/projects";

/**
 * A public, read-only picture of what a city is building
 * (FEATURE_IDEAS Tier 3 §17) — for city partners, libraries and press.
 *
 * Everything here comes from the anon-safe views in migration 0043, which
 * exist so this page can be handed to a stranger: counts for anything a
 * neighborhood scoped to itself, titles only for projects whose author chose
 * "open to anywhere", and no names, owners, locations or view data at all.
 *
 * Readable signed out on purpose — a page you must log in to see is no use
 * to a council officer deciding whether to point residents at it.
 */

type CityRow = {
  city: string;
  slug: string;
  communities: number;
  projects: number;
  neighbors: number;
};

type CityIdea = {
  id: string;
  title: string;
  category: string;
  state: keyof typeof STATE_META;
  created_at: string;
};

async function loadCity(slug: string) {
  const supabase = await createClient();
  const [{ data: city }, { data: categories }, { data: ideas }] =
    await Promise.all([
      supabase.from("public_cities").select("*").eq("slug", slug).maybeSingle(),
      supabase
        .from("public_city_categories")
        .select("category,projects")
        .eq("slug", slug),
      supabase
        .from("public_city_ideas")
        .select("id,title,category,state,created_at")
        .eq("slug", slug)
        .limit(12),
    ]);
  return {
    city: city as CityRow | null,
    categories: (categories ?? []) as { category: string; projects: number }[],
    ideas: (ideas ?? []) as CityIdea[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { city } = await loadCity(slug);
  if (!city) return { title: "City — Peoplearound" };
  const places = city.communities === 1 ? "community" : "communities";
  return {
    title: `What ${city.city} is building — Peoplearound`,
    description: `${city.projects} neighbor-led projects across ${city.communities} ${places} in ${city.city}.`,
  };
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 text-center dark:border-slate-600 dark:bg-zinc-900">
      <p className="text-3xl font-extrabold tracking-tight">{n}</p>
      <p className="mt-1 text-sm text-black/55 dark:text-white/55">{label}</p>
    </div>
  );
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { city, categories, ideas } = await loadCity(slug);
  if (!city) notFound();

  const ranked = [...categories].sort((a, b) => b.projects - a.projects);
  const top = ranked.slice(0, 6);
  const most = ranked[0];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:py-16">
      <Link
        href="/"
        className="text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Peoplearound
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight lg:text-4xl">
        What {city.city} is building
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/60 dark:text-white/60">
        Neighbors here start things and join each other to make them real —
        gardens, repair cafés, walking groups, food drives. This page counts
        what is under way. It never names a neighbor.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          n={city.projects}
          label={city.projects === 1 ? "project" : "projects"}
        />
        <Stat
          n={city.communities}
          label={city.communities === 1 ? "community" : "communities"}
        />
        <Stat
          n={city.neighbors}
          label={city.neighbors === 1 ? "neighbor" : "neighbors"}
        />
      </div>

      {top.length > 0 && most ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            What they are working on
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {top.map((c) => {
              const meta =
                CATEGORY_META[c.category as keyof typeof CATEGORY_META];
              const share = Math.round((c.projects / most.projects) * 100);
              return (
                <li key={c.category} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm">
                    {meta?.emoji ?? "•"} {meta?.label ?? c.category}
                  </span>
                  <span
                    className="h-2.5 rounded-full bg-pa-green"
                    style={{ width: `${Math.max(share, 4)}%` }}
                    aria-hidden
                  />
                  <span className="text-sm tabular-nums text-black/50 dark:text-white/50">
                    {c.projects}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {ideas.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            Open to anyone
          </h2>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            These are the projects whose founders chose to be findable by
            anyone. The rest are visible only inside the community that made
            them.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {ideas.map((i) => {
              const meta =
                CATEGORY_META[i.category as keyof typeof CATEGORY_META];
              const state = STATE_META[i.state] ?? STATE_META.idea;
              return (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-zinc-900"
                >
                  <span className="min-w-0 text-sm">
                    <span className="mr-1.5" aria-hidden>
                      {meta?.emoji ?? "•"}
                    </span>
                    {i.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${state.badge}`}
                  >
                    {state.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl border border-slate-300 bg-white p-6 text-center dark:border-slate-600 dark:bg-zinc-900">
        <p className="font-medium">Live in {city.city}?</p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Join your neighborhood and see everything happening on your street.
        </p>
        <Link
          href="/login#join"
          className="mt-4 inline-block rounded-lg bg-pa-green px-6 py-2.5 text-sm font-medium text-pa-green-ink transition-colors hover:bg-pa-green-hover"
        >
          Join Peoplearound
        </Link>
      </section>

      <p className="mt-8 text-xs text-black/40 dark:text-white/40">
        Counts only, updated live. No neighbor is named on this page and no
        location is published.{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          How privacy works here
        </Link>
        .
      </p>
    </main>
  );
}
