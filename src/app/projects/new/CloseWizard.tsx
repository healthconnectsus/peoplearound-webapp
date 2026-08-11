"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * The lightbox's escape hatch. Goes back where you came from when there's a
 * history entry to go back to (the common case: you clicked a "start
 * something" button from a feed), and falls back to People around when
 * there isn't — a fresh tab on /projects/new, or a link from outside.
 */
export function CloseWizard() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Close"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/people");
      }}
      className="rounded-full p-2 text-black/40 transition-colors hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <X className="h-9 w-9" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
