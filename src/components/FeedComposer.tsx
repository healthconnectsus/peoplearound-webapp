"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND_BUTTON, HELP_BUTTON } from "@/lib/brand";
import {
  UsersRound,
  HandHelping,
  CalendarDays,
  Gift,
  MessageCircleHeart,
  X,
} from "lucide-react";

/**
 * The actionable strip at the top of a feed — Nextdoor's "What's happening,
 * neighbor?" pattern, pointed at our doors. The two most-used doors sit
 * inline; the prompt itself opens a full-page chooser with all five, each an
 * honest link into the flow that actually handles it (nothing here fakes a
 * text field that would swallow a first sentence).
 */

const DOORS: {
  href: string;
  icon: typeof UsersRound;
  title: string;
  desc: string;
  tint: string;
}[] = [
  {
    href: "/projects/new",
    icon: UsersRound,
    title: "Let's do something",
    desc: "Meet people, start an idea, or get help with your project.",
    tint: "bg-pa-green-deep",
  },
  {
    href: "/people?compose=1#asks",
    icon: HandHelping,
    title: "I need a favor",
    desc: "Twenty minutes, a second pair of hands, someone with a dolly.",
    tint: "bg-amber-500",
  },
  {
    href: "/projects/new?intent=meet",
    icon: CalendarDays,
    title: "I have an event",
    desc: "A walk, a game night, a potluck — invite people to come.",
    tint: "bg-sky-600",
  },
  {
    href: "/offers",
    icon: Gift,
    title: "I have an offer",
    desc: "Give it, lend it, or offer a skill. No money — just neighbors.",
    tint: "bg-violet-600",
  },
  {
    href: "/projects/new?intent=community",
    icon: MessageCircleHeart,
    title: "I just want to share something with my community",
    desc: "An idea, a spot, a thought worth putting in front of neighbors.",
    tint: "bg-rose-600",
  },
];

export function FeedComposer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-300 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-zinc-900 sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-w-0 flex-1 basis-full rounded-lg bg-black/[0.05] px-4 py-2.5 text-left text-base font-medium text-slate-600 transition-colors hover:bg-black/[0.08] dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 sm:basis-auto"
        >
          Hey community,&hellip;
        </button>
        <Link
          href="/projects/new"
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${BRAND_BUTTON.projects}`}
        >
          <UsersRound className="h-4 w-4" strokeWidth={2} aria-hidden />
          Let&rsquo;s do something
        </Link>
        <Link
          href="/people?compose=1#asks"
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${HELP_BUTTON}`}
        >
          <HandHelping className="h-4 w-4" strokeWidth={2} aria-hidden />
          I need a favor
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed left-3 top-3 z-10 rounded-full p-3 text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-12 w-12" strokeWidth={2} aria-hidden />
          </button>

          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-20">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Hey community,&hellip;
            </h2>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              What would you like to bring to the people around you?
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {DOORS.map((d) => {
                const Icon = d.icon;
                return (
                  <li key={d.title}>
                    <Link
                      href={d.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-500 dark:bg-zinc-900"
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${d.tint}`}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold leading-snug">
                          {d.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-black/55 dark:text-white/55">
                          {d.desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
