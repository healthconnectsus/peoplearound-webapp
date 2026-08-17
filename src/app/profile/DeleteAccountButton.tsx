"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";

/**
 * "Delete my account" with a warning lightbox. Deletion is permanent and
 * cascades to everything the account ever created — the modal says so
 * plainly before the destructive action is available.
 */
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-300 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete my account
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-950/60">
              ⚠️
            </div>
            <h2 id="delete-account-title" className="mt-4 text-lg font-semibold">
              Delete your account?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
              This is <strong>permanent</strong>. Your profile, your projects,
              your contributions, stars, memberships, events, and RSVPs are
              deleted immediately and cannot be recovered — including your
              part in other projects&apos; histories.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-400 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-slate-400 dark:hover:bg-white/10"
              >
                Keep my account
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => deleteAccount())}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
