"use client";

import { useEffect, useState } from "react";

export type StockPhoto = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

/**
 * The cover-photo pool for a search, fetched once per query.
 *
 * Deliberately just the data: whoever renders it decides whether that's a
 * thumbnail strip, a next/previous pair, or nothing at all. The wizard uses
 * next/previous because a row of thumbnails made the step look like a
 * gallery to shop rather than a post to write.
 */
export function useStockPhotos(query: string, fallbackQuery = "") {
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  // Which query `photos` answers. Comparing this to `query` during render
  // keeps every setState inside the fetch's own callbacks rather than
  // synchronously in the effect body.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/unsplash-photos?q=${encodeURIComponent(query)}` +
        (fallbackQuery ? `&fb=${encodeURIComponent(fallbackQuery)}` : ""),
    )
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((data: { photos?: StockPhoto[] }) => {
        if (cancelled) return;
        setPhotos(data.photos ?? []);
        setLoadedFor(query);
      })
      .catch(() => {
        if (cancelled) return;
        setPhotos([]);
        setLoadedFor(query);
      });
    return () => {
      cancelled = true;
    };
    // Keyed on the query alone: re-running when fallbackQuery's identity
    // changes would re-fetch for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { photos, loading: loadedFor !== query };
}

/**
 * Tell Unsplash a photo was actually used. Their API guidelines require this
 * whenever a returned photo is *used* — not merely previewed — and it also
 * logs the use against the city so the same picture isn't offered to a
 * neighbor next week.
 *
 * Called on submit rather than on every preview: each ping costs one of the
 * 50 hourly API calls, so firing it while someone flips through covers would
 * burn the quota on photos they never posted.
 */
export function trackStockPhotoUse(photo: StockPhoto) {
  void fetch("/api/unsplash-photos/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: photo.downloadLocation, photoId: photo.id }),
  }).catch(() => {});
}
