import { redirect } from "next/navigation";

/**
 * Small help now lives inside "My Communities" — a need for a hand is
 * something you bring to a community rather than a place of its own. The
 * compose flag rides along so the sidebar button still opens the form.
 */
export default async function AsksPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string }>;
}) {
  const { compose } = await searchParams;
  redirect(compose === "1" ? "/neighborhood?compose=1#asks" : "/neighborhood#asks");
}
