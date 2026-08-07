import { redirect } from "next/navigation";

/**
 * Groups now live inside "People around" — a group *is* people, and a
 * separate rail item was a distinction the user had to hold rather than one
 * the product earned. Kept as a redirect so existing links and bookmarks
 * still land somewhere sensible.
 */
export default function GroupsPage() {
  redirect("/people#groups");
}
