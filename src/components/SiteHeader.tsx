import Link from "next/link";
import { signOut } from "@/app/login/actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1000] flex items-center justify-between border-b border-slate-400 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-500 dark:bg-zinc-950/80 lg:hidden">
      <Link href="/" className="flex min-w-0 flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-7 w-auto" />
        <span className="truncate text-[11px] font-medium italic text-black/45 dark:text-white/45">
          Do something with people around you.
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/projects/new"
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          + Start something with people
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-slate-400 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
