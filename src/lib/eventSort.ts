import type { TabDef } from "@/components/FeedTabs";
import type { ProjectEvent } from "@/lib/projects";

/**
 * The events board's tabs.
 *
 * Same strip as the project feed, different questions — because an event is a
 * thing with a date, and the feed's vocabulary does not survive the move. The
 * feed's "Recent" means newest posted; on a list of events that is genuinely
 * ambiguous, since a person reading it will assume it means soonest. So the
 * labels say what they actually do:
 *
 *   Mine        the ones you run, and the ones you said you're coming to
 *   Soon        what is happening next
 *   Just added  announced most recently, which is the feed's "Recent"
 *   Nearby      closest first
 *   Popular     most neighbors going
 *
 * Mine leads, and carries the empty key so it is also where /events lands.
 * The diary you are actually in is worth more than the diary that exists,
 * and the commitments you already made are the ones you can be late for.
 *
 * It is also the only tab that narrows rather than reorders, which makes it
 * the only one that can empty a page that is not empty — so the events page
 * says how many are on around you rather than claiming there are none.
 */
export const EVENT_TABS: readonly TabDef[] = [
  { key: "", label: "Mine", hint: "Yours, and the ones you're going to" },
  { key: "soon", label: "Soon", hint: "Happening next" },
  { key: "added", label: "Just added", hint: "Most recently announced" },
  { key: "nearby", label: "Nearby", hint: "Closest to you first" },
  { key: "popular", label: "Popular", hint: "Most neighbors going" },
] as const;

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

export function sortEventsForTab(
  events: ProjectEvent[],
  tab: string,
  ctx: {
    userId: string;
    /** Where "nearby" is measured from — the viewer's own centre. */
    center?: { lat: number; lng: number } | null;
    /** Project id → coordinates, for the events whose project has a pin. */
    placeOf?: Map<string, { lat: number; lng: number }>;
    /** Projects the viewer founds or co-organizes. */
    stewardedIds?: Set<string>;
  },
): ProjectEvent[] {
  const list = [...events];
  // Every tab falls back to the diary order, so two events that tie on the
  // tab's own question still read as a sensible list rather than a shuffle.
  const bySoonest = (a: ProjectEvent, b: ProjectEvent) =>
    a.starts_at.localeCompare(b.starts_at);

  switch (tab) {
    case "soon":
      // The order the query already returned: soonest first.
      return list;

    case "added":
      return list.sort(
        (a, b) => b.created_at.localeCompare(a.created_at) || bySoonest(a, b),
      );

    case "nearby": {
      const c = ctx.center;
      const places = ctx.placeOf;
      // With no centre there is no "near", so leave the order alone rather
      // than inventing a ranking out of nothing.
      if (!c || !places) return list;
      const far = Number.POSITIVE_INFINITY;
      const d = (e: ProjectEvent) => {
        const at = places.get(e.project_id);
        return at ? distanceKm(c, at) : far;
      };
      return list.sort((a, b) => d(a) - d(b) || bySoonest(a, b));
    }

    case "popular":
      return list.sort(
        (a, b) => b.rsvps.length - a.rsvps.length || bySoonest(a, b),
      );

    default: {
      // "Mine" — the default tab, so it is the empty-key case.
      // Two ways an event is yours: you run it, or you said you're coming.
      // Both are commitments, so both belong here.
      const stewarded = ctx.stewardedIds ?? new Set<string>();
      return list
        .filter(
          (e) =>
            stewarded.has(e.project_id) ||
            e.rsvps.some((r) => r.user_id === ctx.userId),
        )
        .sort(bySoonest);
    }
  }
}
