"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, LogOut, MapPin, Settings, UsersRound } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { initials } from "@/lib/projects";

const ITEM_CLASS =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10";
const ICON_CLASS = "h-4 w-4 text-black/55 dark:text-white/55";

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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="overflow-hidden rounded-full ring-emerald-600/40 transition hover:ring-2"
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
            className="absolute right-0 top-11 z-[1100] w-64 rounded-2xl border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-zinc-900"
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
            <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
            <Link
              href="/ideas"
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              <Lightbulb className={ICON_CLASS} strokeWidth={1.75} aria-hidden />
              My ideas
            </Link>
            <Link
              href="/connections"
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              <UsersRound className={ICON_CLASS} strokeWidth={1.75} aria-hidden />
              My connections
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              <Settings className={ICON_CLASS} strokeWidth={1.75} aria-hidden />
              Settings
            </Link>
            <Link
              href="/neighborhood"
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              <MapPin className={ICON_CLASS} strokeWidth={1.75} aria-hidden />
              Change neighborhood
            </Link>
            <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
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
