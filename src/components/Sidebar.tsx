"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_MARK } from "@/lib/brand";
import type { CSSProperties } from "react";
import {
  CalendarDays,
  Compass,
  Gift,
  HeartHandshake,
  Lightbulb,
  Plus,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { NavCounts } from "@/lib/navCounts";
import { PostButton } from "./PostChooser";

type CountKey = keyof NavCounts;

/**
 * Six places and one action — and the first letters spell the product:
 * P·E·O·P·L·E. That is the brand, so it stays; what went is everything
 * around it. The labels are as short as the acrostic allows, there is one
 * button rather than two coloured ones, and everything about *you* —
 * analytics, settings, help, inviting — lives under your face in the top
 * bar, which is where people look for it.
 */
const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which of your numbers belongs on this rail. Explore has none. */
  count?: CountKey;
  title?: string;
  /** This rail's hue (lib/brand.ts): the ICON wears it, on hover and when
      current. Six rails, six samples along the logo's gradient, so the
      rail is the logo read top to bottom. The label stays plain text. */
  iconHex: string;
}[] = [
  {
    href: "/people",
    label: "People around",
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
    label: "Explore",
    icon: Compass,
    iconHex: BRAND_MARK.community,
  },
];

/**
 * Desktop-only left navigation rail. Phones get a bottom bar (MobileNav)
 * instead; the two are swapped at the lg breakpoint by AppShell.
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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col px-3 py-4 lg:flex">
      <Link href="/" className="block px-1 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/logo.svg" alt="Peoplearound" className="h-auto w-full" />
      </Link>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <nav className="mt-6 flex flex-col gap-0.5">
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
                   beside it. See .rail-label in globals.css. */
                className={`rail-item group flex items-center gap-4 rounded-lg px-3 py-2.5 text-[16px] transition-colors ${
                  active
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
                }`}
              >
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

        {/* The one action. It opens the chooser; the five things you can
            bring are inside it, not laid out here. */}
        <div className="mt-6 px-1">
          <PostButton className="flex w-full items-center justify-center gap-2 rounded-full bg-pa-brand px-5 py-2.5 text-[15px] font-semibold text-pa-brand-ink transition-colors hover:bg-pa-brand-hover">
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Post
          </PostButton>
        </div>

        {isAdmin ? (
          <div className="mt-auto pb-1">
            <Link
              href="/admin"
              data-active={pathname.startsWith("/admin")}
              className={`rail-item rounded-lg px-3 py-1.5 text-[14px] transition-colors ${
                pathname.startsWith("/admin")
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-white/55 dark:hover:text-white/80"
              }`}
            >
              <span className="rail-label">Admin</span>
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
