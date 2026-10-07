import Link from "next/link";

/**
 * The phone's header: the mark, and you.
 *
 * It used to also carry a coloured "Start something" button, a "Clans"
 * link and a Sign out button — three actions nobody reaches for on arrival.
 * Posting lives in the bottom bar now (MobileNav), signing out under your
 * avatar, and the header is quiet enough to leave room for the page.
 */
export function SiteHeader({ personal }: { personal?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-[1000] flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur-md lg:hidden dark:border-slate-700 dark:bg-zinc-950/90">
      <Link href="/" className="flex min-w-0 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-9 w-auto" />
      </Link>
      <div className="flex items-center gap-1">{personal}</div>
    </header>
  );
}
