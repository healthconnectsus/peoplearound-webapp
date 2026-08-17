"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that knows it's submitting.
 *
 * Server actions take a moment — insert, revalidate, redirect — and a button
 * that looks identical the whole time reads as broken. Someone clicked
 * "Share it" ten times in seven seconds and got ten identical projects,
 * because nothing on screen acknowledged the first click.
 *
 * `useFormStatus` only reports the status of the form this button is inside,
 * which is why this has to be its own component rather than a prop on the
 * page.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
  onSubmitting,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  /** Shown while the action runs — say what's happening, not "Loading". */
  pendingLabel: string;
  className?: string;
  /** Fire-and-forget side effect at click time (analytics, tracking pings). */
  onSubmitting?: () => void;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      disabled={pending}
      onClick={() => onSubmitting?.()}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
