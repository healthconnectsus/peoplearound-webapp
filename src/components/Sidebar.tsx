"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/faves", label: "Local Faves", emoji: "⭐" },
  { href: "/groups", label: "Groups", emoji: "👥" },
  { href: "/events", label: "Events", emoji: "📅" },
  { href: "/people", label: "People around", emoji: "🧑‍🤝‍🧑" },
  { href: "/neighborhood", label: "My neighborhood", emoji: "📍" },
];

const UTILITY_ITEMS = [
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help Center" },
  { href: "/invite", label: "Invite neighbors" },
];

/**
 * Desktop-only left navigation rail (Nextdoor-style). Mobile keeps the
 * top SiteHeader; the two are swapped at the lg breakpoint by AppShell.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col px-3 py-4 lg:flex">
      <Link href="/" className="px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-auto w-full" />
      </Link>

      <nav className="mt-5 flex flex-col gap-0.5">
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
              <span className="w-6 text-center text-lg" aria-hidden>
                {item.emoji}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/projects/new"
        className="mt-5 rounded-full bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        + Share an idea
      </Link>

      <div className="mt-auto flex flex-col gap-0.5 pb-1">
        {UTILITY_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? "font-medium text-emerald-700 dark:text-emerald-400"
                : "text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/80"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
