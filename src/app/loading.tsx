import { ContentSkeleton } from "@/components/ContentSkeleton";

/**
 * The loading state.
 *
 * Every page here is server-rendered off several database round trips, and
 * without a loading file Next holds the *previous* page on screen until the
 * next one is ready. Tapping a rail item and having nothing happen for a
 * second reads as a broken button — people tap again, which is how the
 * duplicate-post problem started earlier in this project's life.
 *
 * The skeleton itself lives in ContentSkeleton, because the pages show the
 * same one inside the app shell while their body streams in.
 */
export default function Loading() {
  return <ContentSkeleton />;
}
