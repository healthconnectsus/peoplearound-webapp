import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { STATE_META, TRANSITIONS, type Goal } from "@/lib/goals";
import { setGoalState, deleteGoal } from "../actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function GoalDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("goals")
    .select(
      "id,owner_id,title,description,category,state,created_at,updated_at,owner:profiles(display_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const goal = data as unknown as Goal;
  const isOwner = goal.owner_id === user.id;
  const meta = STATE_META[goal.state];
  const nextStates = TRANSITIONS[goal.state];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <Link
          href="/"
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← Back
        </Link>

        <div className="mt-4 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{goal.title}</h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>

        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          <span className="capitalize">{goal.category}</span> ·{" "}
          {goal.owner?.display_name ?? "Someone"} · {formatDate(goal.created_at)}
        </p>

        {goal.description ? (
          <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">
            {goal.description}
          </p>
        ) : (
          <p className="mt-5 text-sm italic text-black/40 dark:text-white/40">
            No description yet.
          </p>
        )}

        {isOwner && nextStates.length > 0 ? (
          <div className="mt-8">
            <p className="mb-2 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
              Move this goal to
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStates.map((s) => (
                <form key={s} action={setGoalState}>
                  <input type="hidden" name="goalId" value={goal.id} />
                  <input type="hidden" name="state" value={s} />
                  <button
                    type="submit"
                    className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    {STATE_META[s].label}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ) : null}

        {isOwner ? (
          <form action={deleteGoal} className="mt-10">
            <input type="hidden" name="goalId" value={goal.id} />
            <ConfirmSubmit
              message="Delete this goal permanently? This cannot be undone."
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Delete goal
            </ConfirmSubmit>
          </form>
        ) : null}
      </main>
    </div>
  );
}
