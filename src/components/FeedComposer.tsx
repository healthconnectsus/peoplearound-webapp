"use client";

import { useState } from "react";
import { PostChooser } from "./PostChooser";

/**
 * The strip at the top of a feed — one quiet prompt that opens the chooser.
 *
 * It used to also hold two coloured buttons, which with the two in the rail
 * made four primary actions on one screen. The prompt is the whole thing
 * now: tap it and choose what you are bringing. Nothing here fakes a text
 * field that would swallow a first sentence; the chooser leads into the flow
 * that actually handles each kind of post.
 */
export function FeedComposer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="w-full rounded-full bg-black/[0.05] px-5 py-2.5 text-left text-base text-slate-600 transition-colors hover:bg-black/[0.08] dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
        >
          What&rsquo;s happening around you?
        </button>
      </div>
      <PostChooser open={open} onClose={() => setOpen(false)} />
    </>
  );
}
