"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { flagProject, unflagProject } from "../flagActions";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam or advertising" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "unsafe", label: "Unsafe or illegal" },
  { value: "not_local", label: "Not a real local project" },
  { value: "other", label: "Something else" },
];

/**
 * Quiet report control. Deliberately understated — flagging is a safety
 * valve, not a prominent action, and the dialog says plainly that a human
 * reviews it and nothing disappears automatically.
 */
export function FlagButton({
  projectId,
  alreadyFlagged,
}: {
  projectId: string;
  alreadyFlagged: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (alreadyFlagged) {
    return (
      <form action={unflagProject}>
        <input type="hidden" name="projectId" value={projectId} />
        <button
          type="submit"
          className="flex items-center gap-1.5 text-xs text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
        >
          <Flag className="h-3.5 w-3.5 fill-current" aria-hidden />
          You reported this — undo
        </button>
      </form>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        Report this idea
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flag-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            action={flagProject}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <h2 id="flag-title" className="text-lg font-bold">
              Report this idea
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-black/60 dark:text-white/60">
              A community admin reviews reports personally. Nothing disappears
              automatically, and the founder is never told who reported.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {REASONS.map((r, i) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-400 px-3.5 py-2.5 text-sm transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:border-slate-500 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    defaultChecked={i === 0}
                    className="accent-emerald-600"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              name="note"
              rows={2}
              maxLength={500}
              placeholder="Anything the admin should know? (optional)"
              className="mt-3 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
            />

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-400 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
              >
                Send report
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
