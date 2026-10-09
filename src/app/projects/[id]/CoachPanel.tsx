import { NextSteps } from "@/components/NextSteps";
import {
  milestones,
  projectSteps,
  weekLine,
  type CoachProject,
} from "@/lib/coach";

/**
 * "How it's going" — on a project's own page, for whoever runs it.
 *
 * Three things, in the order a founder wants them: where the project stands
 * (the milestones every project passes, ticked from the record), how this
 * week went against last, and what to do next. Nobody else sees it; the
 * numbers come from project_coach (migration 0080), which answers only a
 * steward.
 */
export function CoachPanel({ coach }: { coach: CoachProject }) {
  const marks = milestones(coach);
  const done = marks.filter((m) => m.done).length;
  // The gardener's thought is already on this page, just below.
  const steps = projectSteps(coach).filter((s) => !s.key.startsWith("nudge:"));

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">How it&rsquo;s going</h2>
        <span className="text-xs text-black/50 dark:text-white/50">
          Only you and your co-organizers see this
        </span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={marks.length}
        aria-valuenow={done}
        aria-label={`${done} of ${marks.length} milestones`}
      >
        <div
          className="pa-gradient h-full rounded-full"
          style={{ width: `${Math.round((done / marks.length) * 100)}%` }}
        />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {marks.map((m) => (
          <li
            key={m.label}
            className={
              m.done
                ? "text-black/75 dark:text-white/80"
                : "text-black/35 dark:text-white/35"
            }
          >
            {m.done ? "✓" : "○"} {m.label}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-black/70 dark:text-white/70">
        This week: {weekLine(coach)}
      </p>

      {steps.length > 0 ? (
        <div className="-mx-4 -mb-4 mt-3 [&>section]:mb-0 [&>section]:rounded-t-none [&>section]:border-x-0 [&>section]:border-b-0 [&>section]:shadow-none">
          <NextSteps steps={steps} limit={3} title="Next" />
        </div>
      ) : null}
    </section>
  );
}
