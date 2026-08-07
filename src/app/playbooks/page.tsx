import { redirect } from "next/navigation";

/**
 * Playbooks now live inside "My ideas" — they're only useful at the moment
 * you're deciding what to start. Kept as a redirect for existing links.
 */
export default function PlaybooksPage() {
  redirect("/ideas#playbooks");
}
