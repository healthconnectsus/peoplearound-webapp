"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * The lightbox's escape hatch. Goes back where you came from when there's a
 * history entry to go back to (the common case: you clicked a "start
 * something" button from a feed), and falls back to People around when
 * there isn't — a fresh tab on /projects/new, or a link from outside.
 *
 * Escape does the same thing. This screen covers the entire page, so until
 * now the only way out was to find one X in a corner with a pointer; anyone
 * on a keyboard had to tab through the whole wizard to reach it. Escape is
 * the key people already try on anything that looks like a lightbox.
 *
 * No modal semantics here on purpose: unlike the small-help composer this is
 * a real route, not an overlay toggled over a page, so there is no
 * underlying content to mark inert and nothing to return focus to.
 */
export function CloseWizard() {
  const router = useRouter();

  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/people");
  }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Let a field that handles its own Escape (a combobox, a picker) win.
      if (event.defaultPrevented) return;
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <button
      type="button"
      aria-label="Close"
      onClick={close}
      className="fixed left-3 top-3 z-10 rounded-full p-3 text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <X className="h-12 w-12" strokeWidth={2} aria-hidden />
    </button>
  );
}
