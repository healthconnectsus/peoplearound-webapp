"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronDown } from "lucide-react";

/**
 * "Plan an event" on the Events page.
 *
 * An event belongs to a project — that's the data model and it's the point:
 * events are how a project becomes physical, not free-floating listings. So
 * this button can't just open a form; it has to ask which project first.
 *
 * With one stewarded project it goes straight there. With several it opens a
 * short list. With none it points at starting something, because that's the
 * actual next step rather than a dead end.
 */

export type StewardedProject = { id: string; title: string; emoji: string };

export function PlanEventButton({
  projects,
}: {
  projects: StewardedProject[];
}) {
  const [open, setOpen] = useState(false);

  const BTN =
    "flex items-center gap-2 rounded-lg bg-pa-brand px-5 py-2.5 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover";

  if (projects.length === 0) {
    return (
      <Link href="/projects/new" className={BTN}>
        <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
        Start a project to plan an event
      </Link>
    );
  }

  if (projects.length === 1) {
    return (
      <Link href={`/projects/${projects[0].id}?plan=1#events`} className={BTN}>
        <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
        Plan an event
      </Link>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={BTN}
      >
        <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
        Plan an event
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[1000]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-12 z-[1001] max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-zinc-900">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              For which project?
            </p>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}?plan=1#events`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span aria-hidden>{p.emoji}</span>
                <span className="min-w-0 truncate">{p.title}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
