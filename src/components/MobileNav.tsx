"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Compass,
  Gift,
  Home,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { PostButton } from "./PostChooser";

/**
 * The phone's bottom bar: four places and one action, where a thumb can
 * reach them.
 *
 * Until now the phone had everything in a header — a coloured button, a sign
 * out, a "Clans" link — and the rail's six destinations were not reachable
 * at all without scrolling to a footer. This is the pattern every phone app
 * people already use: the places along the bottom, the one thing you can do
 * in the middle.
 */
const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/people", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/offers", label: "Offers", icon: Gift },
  { href: "/explore", label: "Explore", icon: Compass },
];

export function MobileNav() {
  const pathname = usePathname();
  const tab = (item: (typeof ITEMS)[number]) => {
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <li key={item.href} className="min-w-0">
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
            active
              ? "text-pa-brand"
              : "text-slate-500 dark:text-white/55"
          }`}
        >
          <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
          <span className="truncate">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-slate-700 dark:bg-zinc-950/95"
    >
      <ul className="grid grid-cols-5 items-end">
        {ITEMS.slice(0, 2).map(tab)}
        <li className="flex justify-center pb-1.5">
          <PostButton
            label="Post something"
            className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-pa-brand text-pa-brand-ink shadow-md transition-colors hover:bg-pa-brand-hover"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </PostButton>
        </li>
        {ITEMS.slice(2).map(tab)}
      </ul>
    </nav>
  );
}
