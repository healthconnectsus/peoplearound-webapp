import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { categoryMeta } from "@/lib/projects";
import { communityRecap } from "@/lib/milestones";

/**
 * The neighborhood's year, collectively. Deliberately about the *place*:
 * no person is named, ranked, or thanked more than another — the recap
 * celebrates what a community did, which is the only kind of leaderboard
 * this product allows (UX_SPEC §6).
 */
export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "neighborhood_id,neighborhood:neighborhoods!profiles_neighborhood_id_fkey(name,city)",
    )
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as unknown as {
    neighborhood_id: string | null;
    neighborhood?: { name: string; city: string | null } | null;
  } | null;
  if (!profile?.neighborhood_id) redirect("/neighborhood");

  const parsed = Number.parseInt(yearParam ?? "", 10);
  const year =
    Number.isFinite(parsed) && parsed > 2020 && parsed < 2100
      ? parsed
      : new Date().getFullYear();

  const name = profile.neighborhood?.name ?? "Your neighborhood";
  const recap = await communityRecap(supabase, profile.neighborhood_id, year);

  const lines: { emoji: string; value: number; label: string }[] = [
    { emoji: "💡", value: recap.ideas, label: "ideas shared" },
    { emoji: "🎉", value: recap.built, label: "things finished together" },
    { emoji: "🙌", value: recap.confirmed, label: "acts of help confirmed" },
    { emoji: "📅", value: recap.events, label: "times we met in person" },
    { emoji: "🎁", value: recap.offers, label: "things given or lent" },
  ];

  const quiet = recap.ideas + recap.confirmed + recap.events === 0;

  return (
    <AppShell>
      <main className="w-full max-w-2xl flex-1 p-4 lg:py-6 lg:pl-6 lg:pr-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {name} in {year}
        </h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          What this neighborhood did together — no individual scores, just the
          place.
        </p>

        {quiet ? (
          <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center dark:border-white/15 dark:bg-zinc-900">
            <p className="text-3xl" aria-hidden>
              🌱
            </p>
            <p className="mt-3 font-medium">The year is still young here</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-black/60 dark:text-white/60">
              Every recap starts empty.{" "}
              <Link href="/projects/new" className="underline">
                Share an idea
              </Link>{" "}
              and this page fills itself in.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-emerald-600/20 bg-gradient-to-br from-emerald-50 to-sky-50/60 p-6 dark:border-emerald-500/25 dark:from-emerald-950/40 dark:to-sky-950/20">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                🏘️ {recap.neighbors}{" "}
                {recap.neighbors === 1 ? "neighbor" : "neighbors"} here
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {lines
                  .filter((l) => l.value > 0)
                  .map((l) => (
                    <li key={l.label} className="flex items-baseline gap-3">
                      <span className="text-2xl" aria-hidden>
                        {l.emoji}
                      </span>
                      <span>
                        <span className="text-2xl font-extrabold tracking-tight">
                          {l.value}
                        </span>{" "}
                        <span className="text-sm text-black/70 dark:text-white/70">
                          {l.label}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            {recap.topCategories.length > 0 ? (
              <section className="mt-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                  What we spent the year on
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {recap.topCategories.map((c) => (
                    <li
                      key={c.category}
                      className="rounded-full border border-black/5 bg-white px-3.5 py-1.5 text-sm shadow-sm dark:border-white/5 dark:bg-zinc-900"
                    >
                      {categoryMeta(c.category).emoji}{" "}
                      {categoryMeta(c.category).label} · {c.count}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/recap?year=${year - 1}`}
            className="rounded-full border border-black/15 px-4 py-1.5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            ← {year - 1}
          </Link>
          {year < new Date().getFullYear() ? (
            <Link
              href={`/recap?year=${year + 1}`}
              className="rounded-full border border-black/15 px-4 py-1.5 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {year + 1} →
            </Link>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
