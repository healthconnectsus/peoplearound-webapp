import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { STATE_META, type Goal } from "@/lib/goals";
import { versionLabel } from "@/lib/version";

function GoalCard({ goal }: { goal: Goal }) {
  const meta = STATE_META[goal.state];
  return (
    <li>
      <Link
        href={`/goals/${goal.id}`}
        className="block rounded-xl border border-black/10 p-4 transition-colors hover:border-emerald-500/50 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-medium">{goal.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>
        {goal.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-black/60 dark:text-white/60">
            {goal.description}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          <span className="capitalize">{goal.category}</span> ·{" "}
          {goal.owner?.display_name ?? "Someone"}
        </p>
      </Link>
    </li>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards this route, but guard here too as defense in depth.
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("goals")
    .select(
      "id,owner_id,title,description,category,state,created_at,updated_at,owner:profiles(display_name)",
    )
    .order("created_at", { ascending: false });

  const goals = (data ?? []) as unknown as Goal[];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <h1 className="mb-4 text-lg font-semibold">What&apos;s happening</h1>

        {goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 p-8 text-center dark:border-white/15">
            <p className="text-sm text-black/60 dark:text-white/60">
              No goals yet. Be the first to declare one.
            </p>
            <Link
              href="/goals/new"
              className="mt-3 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Declare a goal
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </ul>
        )}
      </main>

      <footer className="p-4 text-center text-xs text-black/40 dark:text-white/40">
        {versionLabel()}
      </footer>
    </div>
  );
}
