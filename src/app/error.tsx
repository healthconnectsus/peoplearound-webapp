"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * The error boundary. Without one, any thrown error in a server component —
 * a dropped database connection, a migration not yet applied — showed the
 * production default: a bare "Application error: a client-side exception has
 * occurred", with no branding and no way forward.
 *
 * `reset()` re-renders the segment, which is genuinely useful here because
 * most failures on this site are transient (a query timing out, a realtime
 * socket reconnecting) rather than permanent.
 *
 * The digest is shown deliberately: it's the only handle a person has when
 * reporting the problem, and it identifies the error without exposing the
 * stack.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel captures console.error into the function logs, so this is what
    // makes an otherwise invisible client failure findable later.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
      <img src="/logo.svg" alt="Peoplearound" className="h-12 w-auto" />

      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">
        Something went wrong on our side
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/60 dark:text-white/60">
        Not something you did. Trying again usually works — most of these are
        momentary.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-pa-brand px-5 py-2.5 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
        >
          Try again
        </button>
        <Link
          href="/people"
          className="rounded-lg border-2 border-slate-500 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-400 dark:text-white/80 dark:hover:bg-white/10"
        >
          Back to your feed
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 text-xs text-black/40 dark:text-white/40">
          If you report this, quote{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
            {error.digest}
          </code>
        </p>
      ) : null}
    </main>
  );
}
