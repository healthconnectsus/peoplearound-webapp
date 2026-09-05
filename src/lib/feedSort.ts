import type { CardData } from "@/components/ProjectFeedCard";
import type { FeedTab } from "@/components/FeedTabs";

/**
 * How each feed tab orders the same set of cards.
 *
 * Ordering only — never filtering, with one deliberate exception ("Mine",
 * which is a question about ownership rather than an arrangement). A tab
 * that quietly drops things teaches people the list is lying to them.
 *
 * All of it runs on cards the viewer is already entitled to see: RLS has
 * decided that long before this file gets involved, so nothing here can
 * widen access.
 */

const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;

/** Rough great-circle distance in km — precise enough to rank by. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function sortForTab(
  cards: CardData[],
  tab: FeedTab,
  ctx: {
    userId: string;
    /** Where "nearby" is measured from — the viewer's community centre. */
    center?: { lat: number; lng: number } | null;
    /** Project ids the viewer is on the team of. */
    joinedIds?: Set<string>;
  },
): CardData[] {
  const list = [...cards];

  switch (tab) {
    case "recent":
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));

    case "nearby": {
      const c = ctx.center;
      // Without a centre there is no "near", so say so by leaving the order
      // alone rather than inventing a ranking.
      if (!c) return list;
      const far = Number.POSITIVE_INFINITY;
      const d = (p: CardData) =>
        p.lat != null && p.lng != null
          ? distanceKm(c, { lat: p.lat, lng: p.lng })
          : far;
      return list.sort((a, b) => d(a) - d(b) || b.created_at.localeCompare(a.created_at));
    }

    case "trending": {
      // Stars earned recently, not stars ever — otherwise "trending" is just
      // "oldest popular thing" forever. Anything with an event this week gets
      // a nudge, because that is momentum you can actually turn up to.
      const cutoff = Date.now() - FORTNIGHT_MS;
      const heat = (p: CardData) => {
        const fresh = new Date(p.created_at).getTime() > cutoff ? 2 : 0;
        return p.starCount + (p.hot ? 3 : 0) + fresh;
      };
      return list.sort(
        (a, b) => heat(b) - heat(a) || b.created_at.localeCompare(a.created_at),
      );
    }

    case "mine": {
      const joined = ctx.joinedIds ?? new Set<string>();
      return list
        .filter((p) => p.owner_id === ctx.userId || joined.has(p.id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    default:
      // "For you" keeps the feed's own assembled order — freshest first with
      // the story beats already worked out upstream.
      return list;
  }
}
