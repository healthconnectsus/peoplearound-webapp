import { redirect } from "next/navigation";

/**
 * "My Communities" now lives inside "People around" — a community IS people,
 * and the rail spells P·E·O·P·L·E with People around carrying both. The
 * LocateButton and communityActions stay in this folder; only the page
 * moved. Kept as a redirect so old links land somewhere sensible.
 */
export default function NeighborhoodPage() {
  redirect("/people#communities");
}
