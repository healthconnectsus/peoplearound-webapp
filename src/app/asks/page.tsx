import { redirect } from "next/navigation";

/**
 * Small help lives inside "People around" — a need for a hand is a thing you
 * bring to the people near you. The compose flag rides along so the
 * sidebar's button still opens the form.
 */
export default async function AsksPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string }>;
}) {
  const { compose } = await searchParams;
  redirect(compose === "1" ? "/people?compose=1#asks" : "/people#asks");
}
