"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { setProjectState } from "../actions";
import { STATE_META, type ProjectState } from "@/lib/projects";

/**
 * The project's state, as a tag you can change.
 *
 * "Update status" used to be a whole section at the bottom of the page — a
 * heading and two buttons for something that is really just one word about
 * the project. Now the word itself is the control: owners click the tag on
 * the cover photo and pick the next state; everyone else sees a plain tag.
 */
export function StateTag({
  projectId,
  state,
  nextStates,
}: {
  projectId: string;
  state: ProjectState;
  /** Allowed transitions; empty for anyone who can't change it. */
  nextStates: ProjectState[];
}) {
  const [open, setOpen] = useState(false);
  const meta = STATE_META[state];

  if (nextStates.length === 0) {
    return (
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
      >
        {meta.label}
      </span>
    );
  }

  return (
    <span className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Change the project's status"
        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-85 ${meta.badge}`}
      >
        {meta.label}
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>

      {open ? (
        <>
          {/* Click-away, behind the menu. */}
          <span
            className="fixed inset-0 z-[1000]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <span
            role="menu"
            className="absolute right-0 top-7 z-[1001] flex w-48 flex-col rounded-xl border border-slate-400 bg-white p-1 text-left shadow-xl dark:border-slate-500 dark:bg-zinc-900"
          >
            {nextStates.map((s) => (
              <form key={s} action={setProjectState}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="state" value={s} />
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-black transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                >
                  Mark as {STATE_META[s].label.toLowerCase()}
                </button>
              </form>
            ))}
          </span>
        </>
      ) : null}
    </span>
  );
}
