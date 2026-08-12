import Link from "next/link";
import { categoryMeta } from "@/lib/projects";
import { PLAYBOOKS } from "@/lib/playbooks";

/**
 * Proven starting points, rendered inside "My ideas" — a playbook is only
 * useful at the moment you're deciding what to start, which is exactly the
 * page you're on when you have no ideas yet.
 */
export function PlaybookList() {
  return (
    <section id="playbooks" className="mt-10 scroll-mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
        Start from a playbook
      </h2>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">
        Things that have worked in other neighborhoods. Start from one and make
        it yours — every word stays editable.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {PLAYBOOKS.map((pb) => (
          <li
            key={pb.slug}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <h3 className="text-lg font-bold">
              <span className="mr-1.5" aria-hidden>
                {pb.emoji}
              </span>
              {pb.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-black/60 dark:text-white/60">
              {pb.description}
            </p>

            <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">First step:</span> {pb.firstStep}
            </p>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                What to ask for
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {pb.asks.map((a) => (
                  <li
                    key={a}
                    className="rounded-full border border-black/15 px-3 py-1 text-xs text-black/60 dark:border-white/15 dark:text-white/60"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/projects/new?playbook=${pb.slug}`}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Start from this
              </Link>
              <span className="text-xs text-black/40 dark:text-white/40">
                {categoryMeta(pb.category).emoji}{" "}
                {categoryMeta(pb.category).label}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-black/40 dark:text-white/40">
        As neighborhood projects reach completion, their real histories become
        the next playbooks.
      </p>
    </section>
  );
}
