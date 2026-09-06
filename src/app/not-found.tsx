import Link from "next/link";

/**
 * The 404. Until now `notFound()` — which the project and city pages both
 * call — dropped people on Next's default black-and-white page: no branding,
 * no navigation, no way back except the browser button.
 *
 * A missing project is usually a deleted one or a link scoped to a community
 * the reader isn't in, so the copy says that rather than implying they typed
 * something wrong.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
      <img src="/logo.svg" alt="Peoplearound" className="h-12 w-auto" />

      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">
        This page isn&rsquo;t here
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-black/60 dark:text-white/60">
        It may have been removed, or it belongs to a community you&rsquo;re not
        part of yet. Nothing has gone wrong on your side.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/people"
          className="rounded-lg bg-pa-brand px-5 py-2.5 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
        >
          Back to your feed
        </Link>
        <Link
          href="/explore"
          className="rounded-lg border-2 border-slate-500 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-400 dark:text-white/80 dark:hover:bg-white/10"
        >
          Explore communities
        </Link>
      </div>
    </main>
  );
}
