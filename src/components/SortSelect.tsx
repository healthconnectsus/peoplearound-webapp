"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { CHIP, CHIP_ACTIVE, CHIP_IDLE } from "@/lib/chips";
import { useOverlay } from "@/components/useOverlay";
import type { TabDef } from "@/components/FeedTabs";

/**
 * How a list is arranged, as one button rather than a row of them.
 *
 * The chip strip works when the choices are the headline of the page. On the
 * events board they are not: the community picker sits beside them, and five
 * chips plus a picker wrapped onto two lines and pushed the actual events
 * below the fold. One button says the current arrangement and hides the rest
 * until asked.
 *
 * Single-select, so rows carry a tick rather than a checkbox — the same shape
 * as CommunityFilter next to it, deliberately, because they answer the same
 * kind of question. The sort icon is what tells them apart at a glance.
 *
 * Every choice is a URL, so an arrangement stays shareable and the sorting
 * stays on the server where the data is.
 */
export function SortSelect({
  tabs,
  active,
  basePath,
  hash = "feed",
  extraParams = {},
  label = "Sort",
}: {
  tabs: readonly TabDef[];
  active: string;
  basePath: string;
  hash?: string;
  /** Params to carry across a change, e.g. the chosen community. */
  extraParams?: Record<string, string | undefined>;
  /** Named for screen readers; the button itself shows the current choice. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Escape closes this and returns focus to the button that opened it.
  useOverlay(open, () => setOpen(false), { lockScroll: false });

  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  function href(key: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    if (key) params.set("tab", key);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}#${hash}` : `${basePath}#${hash}`;
  }

  function go(key: string) {
    setOpen(false);
    router.push(href(key));
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE} flex max-w-72 items-center gap-2`}
      >
        <ArrowUpDown className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{current.label}</span>
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
            {tabs.map((t) => (
              <button
                key={t.key || "default"}
                type="button"
                role="menuitemradio"
                aria-checked={t.key === active}
                onClick={() => go(t.key)}
                title={t.hint}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                  t.key === active ? "font-semibold" : ""
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 shrink-0 ${t.key === active ? "" : "invisible"}`}
                  strokeWidth={3}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate">{t.label}</span>
                  {/*
                    The hint was a title attribute on the chips, which is to
                    say invisible on touch and to anyone who does not hover.
                    A menu has room to just say it.
                  */}
                  <span className="block text-xs font-normal text-black/45 dark:text-white/45">
                    {t.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
