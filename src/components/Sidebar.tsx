"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_BUTTON, BRAND_MARK, HELP_BUTTON } from "@/lib/brand";
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
  /** This rail's hue, from lib/brand.ts — the ICON wears it, on hover and
      when current. The label stays plain text; colouring the whole row read
      as childish, and colouring a single letter read as a typo.
      These were hardcoded copies of the v1 logo and had drifted several
      logo versions out of date; they now come from the one palette. */
  iconHex: string;
}[] = [
  // Top to bottom, the first letters spell the product: P·E·O·P·L·E.
  // "Explore" is the home feed — it sits last so the word works, and the
  // logo above is a second, always-visible way home.
  {
    href: "/people",
    label: "People around (me)",
    icon: HeartHandshake,
    count: "people",
    title: "Neighbors in your community",
    iconHex: BRAND_MARK.people,
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    count: "events",
    title: "Events you said you're coming to",
    iconHex: BRAND_MARK.events,
  },
  {
    href: "/offers",
    label: "Offers",
    icon: Gift,
    count: "offers",
    title: "Things you've offered",
    iconHex: BRAND_MARK.offers,
  },
  {
    href: "/ideas",
    label: "Projects",
    icon: Lightbulb,
    count: "ideas",
    title: "Ideas you started, plus teams you joined",
    iconHex: BRAND_MARK.projects,
  },
  {
    href: "/faves",
    label: "Local Faves",
    icon: Star,
    count: "faves",
    title: "Ideas your neighbors have starred",
    iconHex: BRAND_MARK.faves,
  },
  {
    href: "/explore",
    label: "Explore Communities",
    icon: Compass,
    iconHex: BRAND_MARK.community,
  },
];

const UTILITY_ITEMS = [
  { href: "/analytics", label: "Your analytics" },
  { href: "/recap", label: "Year in review" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help Center" },
  { href: "/invite", label: "Invite neighbors" },
  { href: "/privacy", label: "Privacy" },
];

/**
 * Desktop-only left navigation rail (Nextdoor-style). Mobile keeps the
 * top SiteHeader; the two are swapped at the lg breakpoint by AppShell.
 */
export function Sidebar({
  counts = null,
  isAdmin = false,
}: {
  /** Your numbers, rail by rail. Null while signed out. */
  counts?: NavCounts | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col px-3 py-4 lg:flex">
      <Link href="/" className="block px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-auto w-full" />
      </Link>

      <div className="relative flex min-h-0 flex-1 flex-col">
      <nav className="mt-5 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          // Zero renders as nothing: an empty rail should read as an
          // invitation, not a scoreboard you're losing.
          const n = item.count && counts ? counts[item.count] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              /* Weight and colour are the whole signal: hovering thickens
                 the label and darkens it, the page you're on stays that
                 way. No fill — the rail never competes with the content
                 beside it. The weight *eases* rather than snapping; see
                 .rail-label in globals.css for why that needs a variable
                 font. Slate rather than black: grey-blue sits quieter
                 next to the wordmark's colours. */
              className={`rail-item group flex items-center gap-4 rounded-lg px-3 py-2.5 text-[16px] transition-colors ${
                active
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              }`}
            >
              {/* The icon wears the wordmark's hue — on hover and while
                  current — via a CSS var so Tailwind's scanner still sees a
                  literal utility class ([color:var(--icon)]) per row. */}
              <Icon
                className={`h-[22px] w-[22px] shrink-0 transition-colors ${
                  active
                    ? ""
                    : "text-slate-500 group-hover:[color:var(--icon)] dark:text-white/60"
                }`}
                style={
                  active
                    ? { color: item.iconHex }
                    : ({ "--icon": item.iconHex } as CSSProperties)
                }
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className="rail-label min-w-0 flex-1 truncate">
                {item.label}
              </span>
              {n > 0 ? (
                <span
                  title={item.title}
                  className={`shrink-0 text-xs font-semibold tabular-nums transition-colors ${
                    active
                      ? "text-slate-700 dark:text-white/70"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-white/40"
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
          className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors ${BRAND_BUTTON.projects}`}
        >
          <UsersRound className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          Start something with people
        </Link>
        <Link
          href="/people?compose=1#asks"
          className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors ${HELP_BUTTON}`}
        >
          <HandHelping className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          Ask for small help
        </Link>
      </div>

      <div className="mt-auto flex flex-col gap-0.5 pb-1">
        {isAdmin ? (
          <Link
            href="/admin"
            data-active={pathname.startsWith("/admin")}
            className={`rail-item rounded-lg px-3 py-1.5 text-[14px] transition-colors ${
              pathname.startsWith("/admin")
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-white/55 dark:hover:text-white/80"
            }`}
          >
            <span className="rail-label">🛡️ Admin</span>
          </Link>
        ) : null}
        {UTILITY_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-active={pathname.startsWith(item.href)}
            className={`rail-item rounded-lg px-3 py-1.5 text-[14px] transition-colors ${
              pathname.startsWith(item.href)
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-white/55 dark:hover:text-white/80"
            }`}
          >
            <span className="rail-label">{item.label}</span>
          </Link>
        ))}
      </div>
      </div>
    </aside>
  );
}
