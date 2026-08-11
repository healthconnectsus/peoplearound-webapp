import { redirect } from "next/navigation";

/**
 * Local Faves now live inside "People around" — what your neighbors starred
 * is a fact about the people around you, not a separate place. Kept as a
 * redirect so existing links and bookmarks still land somewhere sensible.
 */
export default function FavesPage() {
  redirect("/people#faves");
}
