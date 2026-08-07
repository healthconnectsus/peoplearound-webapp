"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Star,
  Users,
  CalendarDays,
  HeartHandshake,
  Lightbulb,
  MapPin,
  Gift,
  HandHelping,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type CommunityInfo = {
  label: string; // e.g. "Manhattan (NYC)"
  mine: number; // your ideas in this neighborhood
  total: number; // all ideas in this neighborhood
  communities?: number | null; // how many communities you belong to
};

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/faves", label: "Local Faves", icon: Star },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/offers", label: "Offers", icon: Gift },
  { href: "/asks", label: "Small help", icon: HandHelping },
  { href: "/people", label: "People around", icon: HeartHandshake },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/ideas", label: "My ideas", icon: Lightbulb },
  { href: "/neighborhood", label: "My Communities", icon: MapPin },
];

const UTILITY_ITEMS = [
  { href: "/analytics", label: "Your analytics" },
  { href: "/recap", label: "Year in review" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help Center" },
  { href: "/invite", label: "Invite neighbors" },
];

/**
 * Desktop-only left navigation rail (Nextdoor-style). Mobile keeps the
 * top SiteHeader; the two are swapped at the lg breakpoint by AppShell.
 */
export function Sidebar({
  community,
  dimmed = false,
  isAdmin = false,
}: {
  community: CommunityInfo | null;
  /** Focus mode (e.g. the idea wizard): veil everything except the logo. */
  dimmed?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col px-3 py-4 lg:flex">
      <Link href="/" className="px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-auto w-full" />
      </Link>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {dimmed ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-3 inset-y-0 z-20 bg-white/80 dark:bg-zinc-950/80"
          />
        ) : null}

      <nav className="mt-5 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
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
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? "" : "text-black/55 dark:text-white/55"}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {item.label}
              </Link>
              {item.href === "/neighborhood" && community ? (
                <div className="ml-11 mt-0.5 flex flex-col gap-0.5 pb-1 text-xs text-black/50 dark:text-white/50">
                  <p className="font-medium text-black/70 dark:text-white/70">
                    {community.label}
                  </p>
                  <p>Your ideas · {community.mine}</p>
                  <p>All ideas · {community.total}</p>
                  {community.communities != null && community.communities > 1 ? (
                    <p>Communities · {community.communities}</p>
                  ) : null}
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
        {isAdmin ? (
          <Link
            href="/admin"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith("/admin")
                ? "font-medium text-emerald-700 dark:text-emerald-400"
                : "text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/80"
            }`}
          >
            🛡️ Admin
          </Link>
        ) : null}
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
      </div>
    </aside>
  );
}
