"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { CHIP, CHIP_ACTIVE, CHIP_IDLE } from "@/lib/chips";

/**
 * Every feed tag, folded into one checkable menu.
 *
 * Fifteen chips wrapped onto three lines and pushed the feed below the fold,
 * and they were single-select: picking "Games" un-picked "Food & drink", so
 * "show me games and food" was impossible. This is one button that opens a
 * list of checkboxes — check as many as you like, and the feed shows
 * anything matching any of them.
 *
 * The selection lives in the URL (`?cat=games,food&help=local`), so a
 * filtered feed is still a shareable link and the filtering still happens on
 * the server.
 */

export type TagGroup = {
  /** URL parameter this group writes to. */
  param: string;
  label: string;
  options: { value: string; label: string; emoji?: string }[];
};

export function TagFilter({
  groups,
  selected,
  basePath,
  extraParams = {},
}: {
  groups: TagGroup[];
  /** Currently checked values, per param. */
  selected: Record<string, string[]>;
  /** e.g. "/people" — the hash is added so the feed stays in view. */
  basePath: string;
  /** Params to preserve untouched, e.g. the chosen community. */
  extraParams?: Record<string, string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const count = Object.values(selected).reduce((n, v) => n + v.length, 0);

  function hrefFor(next: Record<string, string[]>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    for (const [k, v] of Object.entries(next)) if (v.length) params.set(k, v.join(","));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}#feed` : `${basePath}#feed`;
  }

  function toggle(param: string, value: string) {
    const current = selected[param] ?? [];
    const next = {
      ...selected,
      [param]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    };
    router.push(hrefFor(next));
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`${CHIP} ${count > 0 ? CHIP_ACTIVE : CHIP_IDLE} flex items-center gap-2`}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {count > 0 ? `Filters · ${count}` : "Filters"}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </button>

      {open ? (
        <>
          {/* Click-away, behind the menu. */}
          <div
            className="fixed inset-0 z-[1000]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-11 z-[1001] max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-zinc-900"
          >
            {groups.map((g, gi) => (
              <div key={g.param + g.label} className={gi > 0 ? "mt-2" : ""}>
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
                  {g.label}
                </p>
                {g.options.map((o) => {
                  const checked = (selected[g.param] ?? []).includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      onClick={() => toggle(g.param, o.value)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-pa-green-deep bg-pa-green text-pa-green-ink"
                            : "border-slate-400 dark:border-slate-500"
                        }`}
                      >
                        {checked ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className="min-w-0 truncate">
                        {o.emoji ? `${o.emoji} ` : ""}
                        {o.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {count > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(hrefFor({}));
                }}
                className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-black/55 transition-colors hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
