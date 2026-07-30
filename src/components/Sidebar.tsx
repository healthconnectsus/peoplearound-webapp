"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/neighborhood", label: "My neighborhood", emoji: "📍" },
];

/**
 * Desktop-only left navigation rail (Nextdoor-style). Mobile keeps the
 * top SiteHeader; the two are swapped at the lg breakpoint by AppShell.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/10 bg-white px-3 py-4 dark:border-white/10 dark:bg-zinc-900 lg:flex">
      <Link href="/" className="px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-6 w-auto" />
      </Link>

      <Link
        href="/projects/new"
        className="mt-5 rounded-full bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        + Share an idea
      </Link>

      <nav className="mt-5 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.emoji}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-black/50 transition-colors hover:bg-black/5 hover:text-black/70 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/70"
        >
          <span className="text-lg" aria-hidden>
            👋
          </span>
          Sign out
        </button>
      </form>
    </aside>
  );
}
