"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import {
  Compass,
  CalendarDays,
  Star,
  HeartHandshake,
  Lightbulb,
  Gift,
  HandHelping,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { NavCounts } from "@/lib/navCounts";

type CountKey = keyof NavCounts;

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which of your numbers belongs on this rail. Explore deliberately has none. */
  count?: CountKey;
  /** What the number means, on hover. */
  title?: string;
  /** The hex of this rail's letter in the wordmark — only the FIRST letter
      of the label wears it (a drop-cap, not a paint job), on hover and when
      current. Everything else stays neutral so the rail reads calm. */
  letterHex: string;
}[] = [
  // Top to bottom, the first letters spell the product: P·E·O·P·L·E.
  // "Explore" is the home feed — it sits last so the word works, and the
  // logo above is a second, always-visible way home.
  {
    href: "/people",
    label: "People around",
    icon: HeartHandshake,
    count: "people",
    title: "Neighbors in your community",
    letterHex: "#FF4033",
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    count: "events",
    title: "Events you said you're coming to",
    letterHex: "#FFA30F",
  },
  {
    href: "/offers",
    label: "Offers",
    icon: Gift,
    count: "offers",
    title: "Things you've offered",
    letterHex: "#08C08C",
  },
  {
    href: "/ideas",
    label: "Projects",
    icon: Lightbulb,
    count: "ideas",
    title: "Ideas you started, plus teams you joined",
    letterHex: "#2A6BEF",
  },
  {
    href: "/faves",
    label: "Local Faves",
    icon: Star,
    count: "faves",
    title: "Ideas your neighbors have starred",
    letterHex: "#8133E1",
  },
  {
    href: "/",
    label: "Explore",
    icon: Compass,
    letterHex: "#FF3A8A",
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
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col px-3 py-4 lg:flex">
      <Link href="/" className="block px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-auto w-full" />
        {/* The brand promise in five words: warm, plural, action-first
            (MARKETING.md). It sits under the wordmark, not inside it, so the
            logo stays a logo. */}
        {/* Sized to sit on one line under the wordmark: a tagline that
            wraps stops being a tagline. */}
        <span className="mt-1 block whitespace-nowrap px-0.5 text-[12px] font-semibold tracking-tight text-black/45 dark:text-white/45">
          Do something with people around you.
        </span>
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
          // Zero renders as nothing: an empty rail should read as an
          // invitation, not a scoreboard you're losing.
          const n = item.count && counts ? counts[item.count] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              /* Weight is the whole signal: hovering bolds, the page
                 you're on stays bold. No fill, no colour — the rail never
                 competes with the content beside it. */
              className={`group flex items-center gap-4 rounded-lg px-3 py-2.5 text-[16px] ${
                active
                  ? "font-bold text-black dark:text-white"
                  : "font-normal text-black/75 hover:font-bold hover:text-black dark:text-white/75 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`h-[22px] w-[22px] shrink-0 ${
                  active
                    ? "text-black dark:text-white"
                    : "text-black/60 group-hover:text-black dark:text-white/60 dark:group-hover:text-white"
                }`}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">
                {/* Only the first letter wears the wordmark's colour — on
                    hover and while current — so the rail spells itself out
                    in the logo's own hues without becoming a paint box. */}
                <span
                  className={active ? "" : "transition-colors group-hover:[color:var(--letter)]"}
                  style={
                    active
                      ? { color: item.letterHex }
                      : ({ "--letter": item.letterHex } as CSSProperties)
                  }
                >
                  {item.label.slice(0, 1)}
                </span>
                {item.label.slice(1)}
              </span>
              {n > 0 ? (
                <span
                  title={item.title}
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    active
                      ? "text-black/70 dark:text-white/70"
                      : "text-black/40 dark:text-white/40"
                  }`}
                >
                  {n}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* The two doors sit between the places (above) and the utilities
          (below): orient first — the rails carry your numbers — then act.
          Both solid; the hierarchy is carried by hue, not by weight, so
          asking for a hand doesn't look like the lesser option. Icons and
          labels align left with the rails above them. */}
      <div className="mt-5 flex flex-col gap-2">
        <Link
          href="/projects/new"
          className="flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <UsersRound className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          Start something with people
        </Link>
        <Link
          href="/people?compose=1#asks"
          className="flex items-center gap-2.5 rounded-full bg-amber-400 px-4 py-2.5 text-[15px] font-medium text-amber-950 transition-colors hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400"
        >
          <HandHelping className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          Ask for small help
        </Link>
      </div>

      <div className="mt-auto flex flex-col gap-0.5 pb-1">
        {isAdmin ? (
          <Link
            href="/admin"
            className={`rounded-lg px-3 py-1.5 text-[14px] transition-colors ${
              pathname.startsWith("/admin")
                ? "font-bold text-black dark:text-white"
                : "font-normal text-black/55 hover:font-bold hover:text-black/80 dark:text-white/55 dark:hover:text-white/80"
            }`}
          >
            🛡️ Admin
          </Link>
        ) : null}
        {UTILITY_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-[14px] transition-colors ${
              pathname.startsWith(item.href)
                ? "font-bold text-black dark:text-white"
                : "font-normal text-black/55 hover:font-bold hover:text-black/80 dark:text-white/55 dark:hover:text-white/80"
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
