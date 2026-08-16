"use client";

import { useEffect, useState } from "react";

type Photo = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

/**
 * Three real, searchable stock photos alongside the upload option — for the
 * person whose idea doesn't have a photo yet ("community garden" has no
 * garden to photograph until it exists). Renders nothing if
 * UNSPLASH_ACCESS_KEY isn't configured or the search comes up empty; this
 * is a bonus on top of upload, never a replacement for it.
 */
export function StockPhotoPicker({
  query,
  selectedUrl,
  onPick,
  autoPick = false,
}: {
  /** Re-searches whenever this changes — pass the category label. */
  query: string;
  selectedUrl: string | null;
  onPick: (url: string, attribution: { name: string; url: string } | null) => void;
  /** Preselect the first result when nothing is chosen yet, so the preview
      shows a real cover instead of an empty panel. Off by default — this
      should never overwrite a photo someone deliberately uploaded. */
  autoPick?: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  // Which query the current `photos` answers — comparing this to `query`
  // during render (rather than a separately-set `loading` flag) is what
  // keeps every setState call inside the fetch's own async callbacks, never
  // synchronously in the effect body itself.
  const [loadedForQuery, setLoadedForQuery] = useState<string | null>(null);
  const loading = loadedForQuery !== query;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/unsplash-photos?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((data: { photos?: Photo[] }) => {
        if (cancelled) return;
        const list = data.photos ?? [];
        setPhotos(list);
        setLoadedForQuery(query);
        // Auto-pick happens inside the fetch callback (not an effect) so it
        // stays one render, and only when the field is genuinely empty.
        if (autoPick && !selectedUrl && list[0]) {
          onPick(list[0].url, {
            name: list[0].photographer,
            url: list[0].photographerUrl,
          });
          void fetch("/api/unsplash-photos/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: list[0].downloadLocation,
              photoId: list[0].id,
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPhotos([]);
        setLoadedForQuery(query);
      });
    return () => {
      cancelled = true;
    };
    // Deliberately keyed on `query` alone: re-running when `selectedUrl` or
    // the `onPick` identity changes would re-fetch on every pick and let
    // auto-pick fight the user's own choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!loading && photos?.length === 0) return null;

  const picked = photos?.find((p) => p.url === selectedUrl) ?? null;

  return (
    <div className="mt-2">
      <p className="mb-1.5 text-xs text-black/50 dark:text-white/50">
        Or pick a free stock photo
      </p>
      <div className="flex gap-2">
        {loading && !photos
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="h-16 w-24 shrink-0 animate-pulse rounded-lg bg-black/5 dark:bg-white/10"
              />
            ))
          : photos?.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.alt}
                onClick={() => {
                  onPick(p.url, { name: p.photographer, url: p.photographerUrl });
                  // Fire-and-forget: required by the Unsplash API guidelines
                  // whenever a returned photo is actually used, not just shown.
                  fetch("/api/unsplash-photos/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      location: p.downloadLocation,
                      photoId: p.id,
                    }),
                  }).catch(() => {});
                }}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-cover bg-center ring-2 ring-offset-1 transition-all hover:opacity-90 ${
                  selectedUrl === p.url
                    ? "ring-emerald-600"
                    : "ring-transparent"
                }`}
                style={{ backgroundImage: `url(${p.thumb})` }}
              />
            ))}
      </div>
      {picked ? (
        <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
          Photo by{" "}
          <a
            href={picked.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black/60 dark:hover:text-white/60"
          >
            {picked.photographer}
          </a>{" "}
          on{" "}
          <a
            href="https://unsplash.com/?utm_source=peoplearound&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black/60 dark:hover:text-white/60"
          >
            Unsplash
          </a>
        </p>
      ) : null}
    </div>
  );
}
