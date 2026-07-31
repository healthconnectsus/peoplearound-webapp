"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type CommunityInfo = {
  label: string; // e.g. "Manhattan (NYC)"
  mine: number; // your ideas in this neighborhood
  total: number; // all ideas in this neighborhood
};

const NAV_ITEMS = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/faves", label: "Local Faves", emoji: "⭐" },
  { href: "/groups", label: "Groups", emoji: "👥" },
  { href: "/events", label: "Events", emoji: "📅" },
  { href: "/people", label: "People around", emoji: "🧑‍🤝‍🧑" },
  { href: "/ideas", label: "My ideas", emoji: "💡" },
  { href: "/neighborhood", label: "My community", emoji: "🏘️" },
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
export function Sidebar({ community }: { community: CommunityInfo | null }) {
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
            <div key={item.href}>
              <Link
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
              {item.href === "/neighborhood" && community ? (
                <div className="ml-12 mt-0.5 flex flex-col gap-0.5 pb-1 text-xs text-black/50 dark:text-white/50">
                  <p className="font-medium text-black/70 dark:text-white/70">
                    {community.label}
                  </p>
                  <p>
                    Your ideas · {community.mine}
                  </p>
                  <p>
                    All ideas · {community.total}
                  </p>
                </div>
              ) : null}
            </div>
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
