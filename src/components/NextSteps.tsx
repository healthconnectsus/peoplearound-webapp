import Link from "next/link";
import type { Step } from "@/lib/coach";

/**
 * "Your next steps" — the coach's list, one sentence and one button each.
 *
 * Quiet on purpose: a white card, a dot, a line, a text button. It sits at
 * the top of the home page, so it has to be worth reading every time and
 * easy to ignore when it is not. Renders nothing when there is nothing to do.
 */
export function NextSteps({
  steps,
  limit,
  title = "Your next steps",
  more,
}: {
  steps: Step[];
  limit?: number;
  title?: string;
  /** A link to the full list, shown when some were cut. */
  more?: { href: string; label: string };
}) {
  if (steps.length === 0) return null;
  const shown = limit ? steps.slice(0, limit) : steps;

  return (
    <section
      aria-label={title}
      className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-zinc-900"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {more && shown.length < steps.length ? (
          <Link
            href={more.href}
            className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
          >
            {more.label}
          </Link>
        ) : null}
      </div>
      <ul className="mt-2 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map((s) => (
          <li key={s.key} className="flex items-center gap-3 py-2.5">
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${
                s.weight >= 80
                  ? "bg-pa-accent"
                  : s.weight >= 50
                    ? "bg-pa-brand"
                    : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
            <p className="min-w-0 flex-1 text-sm leading-snug">{s.text}</p>
            <Link
              href={s.href}
              className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium transition-colors hover:border-pa-brand hover:text-pa-brand dark:border-slate-600"
            >
              {s.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
