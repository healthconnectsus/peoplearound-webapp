"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { CHIP, CHIP_ACTIVE, CHIP_IDLE } from "@/lib/chips";

/**
 * Which community's feed you're reading.
 *
 * One button showing the current choice, opening the rest — laying every
 * community out flat pushed the feed down a line for anyone who belongs to
 * more than two or three. "All my communities" is the default and the first
 * option; the last one leaves for Explore instead of filtering.
 *
 * Single-select, so the menu marks the current row with a tick rather than a
 * checkbox — unlike TagFilter next to it, where several can be on at once.
 */
export function CommunityFilter({
  communities,
  selected,
}: {
  communities: { id: string; label: string }[];
  selected: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const ALL = "All my communities";
  const current = communities.find((c) => c.id === selected)?.label ?? ALL;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const rowClass = (isCurrent: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
      isCurrent ? "font-semibold" : ""
    }`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`${CHIP} ${selected ? CHIP_ACTIVE : CHIP_IDLE} flex max-w-72 items-center gap-2`}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      </button>

      {open ? (
        <>
          {/* Click-away, behind the menu. */}
          <div
            className="fixed inset-0 z-[1000]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-11 z-[1001] max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => go("/people#feed")}
              className={rowClass(selected === "")}
            >
              <Check
                className={`h-4 w-4 shrink-0 ${selected === "" ? "" : "invisible"}`}
                strokeWidth={3}
                aria-hidden
              />
              {ALL}
            </button>

            {communities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => go(`/people?community=${c.id}#feed`)}
                className={rowClass(selected === c.id)}
              >
                <Check
                  className={`h-4 w-4 shrink-0 ${selected === c.id ? "" : "invisible"}`}
                  strokeWidth={3}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{c.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => go("/explore")}
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-black/55 transition-colors hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
            >
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              Add a community
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
