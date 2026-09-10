import Link from "next/link";
import { chip } from "@/lib/chips";

/**
 * The feed's tab strip — one way of looking at a list, chosen from five.
 *
 * Server-rendered links rather than a client control, so every view has its
 * own shareable URL and the sorting stays on the server where the data is.
 *
 * The tabs are orderings, never filters: each one shows the same set of
 * things you're entitled to see, arranged by a different question. "Nearby"
 * doesn't hide the far ones, it puts the close ones first. That matters
 * because a tab that silently drops content teaches people not to trust the
 * list.
 */

export const FEED_TABS = [
  { key: "", label: "For you", hint: "Freshest things in your communities" },
  { key: "recent", label: "Recent", hint: "Newest first" },
  { key: "nearby", label: "Nearby", hint: "Closest to you first" },
  { key: "trending", label: "Trending", hint: "Most starred this fortnight" },
  { key: "mine", label: "Mine", hint: "Yours, and the teams you joined" },
] as const;

export type FeedTab = (typeof FEED_TABS)[number]["key"];

/**
 * A tab is a key, a label and the sentence that explains it on hover.
 *
 * Deliberately generic: the events board asks different questions of its list
 * than the project feed does ("soonest" is not "newest"), but it should look
 * and behave identically, so the two share this strip rather than growing a
 * second copy of it that drifts.
 */
export type TabDef = { readonly key: string; readonly label: string; readonly hint: string };

/**
 * Anything unrecognised falls back to the first tab rather than an empty
 * page — a hand-edited or stale `?tab=` should look like the default, not
 * like a bug.
 */
export function readTab(raw: string | undefined): FeedTab {
  const found = FEED_TABS.find((t) => t.key === (raw ?? "").trim());
  return (found?.key ?? "") as FeedTab;
}

/** The same, for any other tab set. */
export function readTabFrom(
  raw: string | undefined,
  tabs: readonly TabDef[],
): string {
  const found = tabs.find((t) => t.key === (raw ?? "").trim());
  return found?.key ?? tabs[0].key;
}

export function FeedTabs({
  active,
  basePath,
  extraParams = {},
  tabs = FEED_TABS,
  ariaLabel = "Sort the feed",
  hash = "feed",
}: {
  active: string;
  /** e.g. "/ideas" */
  basePath: string;
  /** Params to carry across tabs, e.g. the chosen community. */
  extraParams?: Record<string, string | undefined>;
  /** Defaults to the project feed's five. */
  tabs?: readonly TabDef[];
  ariaLabel?: string;
  /** Anchor to jump to, so choosing a tab doesn't lose your place. */
  hash?: string;
}) {
  function href(tab: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    if (tab) params.set("tab", tab);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}#${hash}` : `${basePath}#${hash}`;
  }

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key || "foryou"}
          href={href(t.key)}
          title={t.hint}
          aria-current={active === t.key ? "page" : undefined}
          className={chip(active === t.key)}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
