"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { createCommunity } from "@/app/neighborhood/communityActions";
import { KIND_META } from "@/lib/communities";

/**
 * Starting a community, behind a button.
 *
 * The form used to sit open at the bottom of the communities list — four
 * empty fields you scrolled past every visit, taking up more room than the
 * communities themselves. It opens in the same full-page lightbox the two
 * composers use, so "make a thing" looks the same everywhere in the app.
 */

const INPUT =
  "w-full rounded-lg border border-slate-400 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-slate-400";

export function NewCommunityDialog() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-2 rounded-full border border-slate-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
      >
        <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Start a community
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950">
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="fixed left-3 top-3 z-10 rounded-full p-3 text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-12 w-12" strokeWidth={2} aria-hidden />
      </button>

      <div className="mx-auto w-full max-w-xl px-4 py-20">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Start a community
        </h1>
        <p className="mt-2 text-sm text-black/55 dark:text-white/55">
          A neighborhood, a building, a hobby, a cause — anywhere a group of
          people already belongs together.
        </p>

        <form action={createCommunity} className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="name"
              required
              autoFocus
              maxLength={80}
              placeholder="Chess players of Manhattan"
              className={`${INPUT} flex-1`}
            />
            <select
              name="kind"
              className={`${INPUT} sm:w-44`}
              defaultValue="interest"
            >
              {Object.entries(KIND_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            name="city"
            maxLength={80}
            placeholder="City (optional)"
            className={INPUT}
          />
          <input
            type="text"
            name="description"
            maxLength={300}
            placeholder="One line about who this is for (optional)"
            className={INPUT}
          />
          <SubmitButton
            pendingLabel="Creating…"
            className="mt-2 self-start rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Create community
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
