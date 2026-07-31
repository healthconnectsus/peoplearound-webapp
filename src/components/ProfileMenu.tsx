"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { initials } from "@/lib/projects";

export function ProfileMenu({
  name,
  neighborhood,
}: {
  name: string;
  neighborhood: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 ring-emerald-600/40 transition hover:ring-2 dark:bg-emerald-900 dark:text-emerald-200"
      >
        {initials(name)}
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
            className="absolute right-0 top-11 z-[1100] w-64 rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900"
          >
            <div className="flex flex-col items-center px-3 pb-3 pt-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {initials(name)}
              </span>
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
            <div className="my-1 border-t border-black/5 dark:border-white/10" />
            <Link
              href="/ideas"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              💡 My ideas
            </Link>
            <Link
              href="/connections"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              🤝 My connections
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              ⚙️ Settings
            </Link>
            <Link
              href="/neighborhood"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              📍 Change neighborhood
            </Link>
            <div className="my-1 border-t border-black/5 dark:border-white/10" />
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                👋 Sign out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
