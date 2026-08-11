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
      className="fixed left-3 top-3 z-10 rounded-full p-3 text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <X className="h-12 w-12" strokeWidth={2} aria-hidden />
    </button>
  );
}
