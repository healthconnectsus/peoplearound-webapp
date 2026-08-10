"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Star,
  CalendarDays,
  HeartHandshake,
  Lightbulb,
  MapPin,
  Gift,
  HandHelping,
  type LucideIcon,
} from "lucide-react";
import type { NavCounts } from "@/lib/navCounts";

type CountKey = keyof NavCounts;

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which of your numbers belongs on this rail. Home deliberately has none. */
  count?: CountKey;
  /** What the number means, on hover. */
  title?: string;
}[] = [
  { href: "/", label: "Home", icon: Home },
  {
    href: "/faves",
    label: "Local Faves",
    icon: Star,
    count: "faves",
    title: "Ideas your neighbors have starred",
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    count: "events",
    title: "Events you said you're coming to",
  },
  {
    href: "/offers",
    label: "Offers",
    icon: Gift,
    count: "offers",
    title: "Things you've offered",
  },
  {
    href: "/asks",
    label: "Small help",
    icon: HandHelping,
    count: "asks",
    title: "Times you've helped a neighbor",
  },
  {
    href: "/people",
    label: "People around",
    icon: HeartHandshake,
    count: "people",
    title: "Neighbors in your community",
  },
  {
    href: "/ideas",
    label: "My ideas",
    icon: Lightbulb,
    count: "ideas",
    title: "Ideas you started, plus teams you joined",
  },
  {
    href: "/neighborhood",
    label: "My Communities",
    icon: MapPin,
    count: "communities",
    title: "Communities you belong to",
  },
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
  counts = null,
  dimmed = false,
  isAdmin = false,
}: {
  /** Your numbers, rail by rail. Null while signed out. */
  counts?: NavCounts | null;
  /** Focus mode (e.g. the idea wizard): veil everything except the logo. */
  dimmed?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col px-3 py-4 lg:flex">
      <Link href="/" className="block px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-auto w-full" />
        {/* The brand promise in five words: warm, plural, action-first
            (MARKETING.md). It sits under the wordmark, not inside it, so the
            logo stays a logo. */}
        <span className="mt-1 block px-0.5 text-[13px] font-medium italic text-black/45 dark:text-white/45">
          Let&rsquo;s do something together.
        </span>
      </Link>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {dimmed ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-3 inset-y-0 z-20 bg-white/80 dark:bg-zinc-950/80"
          />
        ) : null}

      {/* Both doors, above the rails: the two things you can *start* come
          before the eight places you can browse. Filled vs outlined keeps
          the hierarchy — sharing is what this place is for, but someone who
          just needs a hand shouldn't have to go looking for the door. */}
      <div className="mt-5 flex flex-col gap-2">
        <Link
          href="/projects/new"
          className="rounded-full bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          + Share something to do
        </Link>
        <Link
          href="/asks?compose=1"
          className="rounded-full border border-emerald-600/40 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          🙋 Ask for small help
        </Link>
      </div>

      <nav className="mt-5 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          // Zero renders as nothing: an empty rail should read as an
          // invitation, not a scoreboard you're losing.
          const n = item.count && counts ? counts[item.count] : 0;
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
              <Icon
                className={`h-5 w-5 shrink-0 ${active ? "" : "text-black/55 dark:text-white/55"}`}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {n > 0 ? (
                <span
                  title={item.title}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    active
                      ? "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                      : "text-black/45 dark:text-white/45"
                  }`}
                >
                  {n}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

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
