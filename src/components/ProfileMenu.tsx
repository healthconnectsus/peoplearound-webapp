"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CircleHelp,
  History,
  Lightbulb,
  Lock,
  LogOut,
  MapPin,
  Settings,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { initials } from "@/lib/projects";
import { useOverlay } from "@/components/useOverlay";

const ITEM_CLASS =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10";
const ICON_CLASS = "h-4 w-4 text-black/55 dark:text-white/55";

/**
 * Everything that is about you, in the one place people look for it.
 *
 * The rail used to list analytics, the year in review, settings, help,
 * inviting and privacy as six small links under the navigation; the top bar
 * had a "My clan" link of its own. They are all here now, in groups: what
 * you do, how you grow the place, how the account works. The rail is left to
 * navigation.
 */
const GROUPS: { href: string; label: string; icon: LucideIcon }[][] = [
  [
    { href: "/ideas?tab=mine", label: "My ideas", icon: Lightbulb },
    { href: "/connections", label: "My connections", icon: UsersRound },
    { href: "/clans", label: "My clan", icon: Users },
  ],
  [
    { href: "/invite", label: "Invite neighbors", icon: UserPlus },
    { href: "/analytics", label: "Your analytics", icon: TrendingUp },
    { href: "/recap", label: "Year in review", icon: History },
  ],
  [
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/neighborhood", label: "Change neighborhood", icon: MapPin },
    { href: "/help", label: "Help Center", icon: CircleHelp },
    { href: "/privacy", label: "Privacy", icon: Lock },
  ],
];

function Avatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  className: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, unoptimized is fine
      <img
        src={avatarUrl}
        alt=""
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} flex items-center justify-center bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200`}
    >
      {initials(name)}
    </span>
  );
}

export function ProfileMenu({
  name,
  neighborhood,
  avatarUrl,
}: {
  name: string;
  neighborhood: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes this and puts focus back on the button that opened it.
  useOverlay(open, () => setOpen(false), { lockScroll: false });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your menu"
        className="overflow-hidden rounded-full ring-pa-brand/40 transition hover:ring-2"
      >
        <Avatar
          name={name}
          avatarUrl={avatarUrl}
          className="h-9 w-9 rounded-full text-xs"
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1090] cursor-default"
            tabIndex={-1}
          />
          <div
            role="menu"
            className="absolute right-0 top-11 z-[1100] max-h-[calc(100vh-5rem)] w-64 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-zinc-900"
          >
            <div className="flex flex-col items-center px-3 pb-3 pt-4 text-center">
              <Avatar
                name={name}
                avatarUrl={avatarUrl}
                className="h-16 w-16 rounded-full text-xl"
              />
              <p className="mt-2 font-medium">{name}</p>
              {neighborhood ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  {neighborhood}
                </p>
              ) : null}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="mt-3 rounded-full bg-black/5 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                View profile
              </Link>
            </div>

            {GROUPS.map((group, i) => (
              <div key={i}>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                {group.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={ITEM_CLASS}
                    >
                      <Icon className={ICON_CLASS} strokeWidth={1.75} aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            <form action={signOut}>
              <button type="submit" className={`${ITEM_CLASS} w-full text-left`}>
                <LogOut className={ICON_CLASS} strokeWidth={1.75} aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
