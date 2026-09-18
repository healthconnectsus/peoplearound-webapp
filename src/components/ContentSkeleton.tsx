/**
 * The shape of a page before its content arrives.
 *
 * A skeleton in the shape of a feed rather than a spinner: it says "content
 * is coming and roughly this much of it", and it doesn't move, so it stays
 * quiet under prefers-reduced-motion without needing a special case.
 *
 * Used twice. `app/loading.tsx` shows it during a client navigation, and
 * every signed-in page shows it inside the app shell while its own body
 * streams in — so the frame of the page is on screen at the first byte and
 * this sits exactly where the content will land.
 */
export function ContentSkeleton() {
  return (
    <div className="w-full max-w-3xl p-4 lg:py-6 lg:pl-36 lg:pr-8" aria-hidden>
      <span className="sr-only" role="status">
        Loading
      </span>

      <div className="h-8 w-52 rounded-lg bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-4 w-72 rounded bg-black/[0.07] dark:bg-white/[0.07]" />

      <div className="mt-6 flex gap-2">
        {[64, 80, 72].map((w, i) => (
          <div
            key={i}
            style={{ width: w }}
            className="h-9 rounded-lg bg-black/[0.07] dark:bg-white/[0.07]"
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-300 bg-white dark:border-slate-600 dark:bg-zinc-900"
          >
            <div className="h-40 w-full bg-black/[0.06] dark:bg-white/[0.06]" />
            <div className="p-4">
              <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
              <div className="mt-2 h-3 w-full rounded bg-black/[0.06] dark:bg-white/[0.06]" />
              <div className="mt-1.5 h-3 w-4/5 rounded bg-black/[0.06] dark:bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
