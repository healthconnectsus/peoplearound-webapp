"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Gift,
  HandHelping,
  MessageCircleHeart,
  UsersRound,
  X,
} from "lucide-react";
import { useOverlay } from "@/components/useOverlay";

/**
 * The one "post" action, and the five doors behind it.
 *
 * The app used to show two large coloured buttons in the rail, two more in
 * the composer and one in the phone header — five ways to start, all
 * competing. Now there is one button, wherever it appears (rail, composer,
 * the phone's bottom bar), and it opens this: a full-screen choice of what
 * you are bringing to the people around you. Each door is an honest link
 * into the flow that actually handles it.
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
    tint: "bg-pa-brand",
  },
  {
    href: "/asks?compose=1",
    icon: HandHelping,
    title: "I need a favor",
    desc: "Twenty minutes, a second pair of hands, someone with a dolly.",
    tint: "bg-pa-green-deep",
  },
  {
    href: "/projects/new?intent=meet",
    icon: CalendarDays,
    title: "I have an event",
    desc: "A walk, a game night, a potluck — invite people to come.",
    tint: "bg-pa-orange-deep",
  },
  {
    href: "/offers",
    icon: Gift,
    title: "I have an offer",
    desc: "Give it, lend it, or offer a skill. No money — just neighbors.",
    tint: "bg-pa-accent",
  },
  {
    href: "/projects/new?intent=community",
    icon: MessageCircleHeart,
    title: "I just want to share something",
    desc: "An idea, a spot, a thought worth putting in front of neighbors.",
    tint: "bg-pa-brand-deeper",
  },
];

export function PostChooser({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Escape closes, the page behind stops scrolling, focus returns to the
  // button that opened it.
  useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What would you like to post?"
      className="fixed inset-0 z-[1200] overflow-y-auto bg-white dark:bg-zinc-950"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed right-3 top-3 z-10 rounded-full p-3 text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-8 w-8" strokeWidth={2} aria-hidden />
      </button>

      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-20">
        <h2 className="text-3xl font-extrabold tracking-tight">
          What are you bringing?
        </h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Everything here is done with the people around you.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {DOORS.map((d) => {
            const Icon = d.icon;
            return (
              <li key={d.title}>
                <Link
                  href={d.href}
                  onClick={onClose}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-zinc-900 dark:hover:border-slate-500"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${d.tint}`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug">
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
  );
}

/** A button that opens the chooser. Style it like whatever it sits among. */
export function PostButton({
  className = "",
  children,
  label,
}: {
  className?: string;
  children: React.ReactNode;
  /** For screen readers when the visible content is an icon alone. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        className={className}
      >
        {children}
      </button>
      <PostChooser open={open} onClose={() => setOpen(false)} />
    </>
  );
}
