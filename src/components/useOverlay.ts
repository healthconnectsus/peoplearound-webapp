"use client";

import { useEffect, useRef } from "react";

/**
 * The keyboard contract a full-screen overlay owes its user.
 *
 * The wizards cover the whole page and, until now, could only be left by
 * finding and clicking one X in a corner. That is fine with a mouse and a
 * dead end without one: Escape did nothing, the page behind kept scrolling
 * under the overlay, and on close the focus ring vanished to the top of the
 * document rather than returning to the button that had opened it — so a
 * keyboard user had to tab back through the whole rail to get where they
 * were.
 *
 * Three obligations, all of them small:
 *   - Escape closes. It is the one key everybody already tries.
 *   - The page behind does not scroll while the overlay is up.
 *   - Focus returns to whatever opened it.
 *
 * The close callback is held in a ref so that passing an inline arrow
 * function does not tear down and re-register the listener on every render —
 * which would also re-run the focus-restore cleanup mid-life and throw focus
 * around while the overlay is still open.
 */
export function useOverlay(
  open: boolean,
  onClose: () => void,
  /**
   * Whether the page behind should stop scrolling. True for a full-screen
   * wizard; false for a dropdown, which is small, anchored to its trigger,
   * and has no business freezing the page under it. The rest of the contract
   * — Escape, and focus back to the trigger — is the same either way, which
   * is why the dropdowns share this hook rather than growing their own
   * half-version of it.
   */
  { lockScroll = true }: { lockScroll?: boolean } = {},
) {
  const closeRef = useRef(onClose);
  // Written in an effect rather than during render: a ref mutated while
  // rendering is not safe under concurrent rendering, and React's lint rule
  // rejects it. This runs after every commit, so the ref is current by the
  // time any keypress can reach the listener below.
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Whatever had focus when we opened is where focus belongs on close.
    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      // The opener can be gone by now (a re-render replaced it), so this is
      // best-effort rather than guaranteed.
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [open, lockScroll]);
}
