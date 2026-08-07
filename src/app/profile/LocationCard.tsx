"use client";

import { useState } from "react";
import { MapPicker } from "@/components/MapPicker";
import { setMyLocation, forgetMyLocation } from "./locationActions";

/**
 * "Where am I?" — private to the user (migration 0031 stores it in a
 * separate own-row-only table, blunted to ~1.1 km). Used to centre their own
 * map; never shown to anyone else, never used to pin them for others.
 */
export function LocationCard({
  initial,
  center = null,
}: {
  initial: { lat: number; lng: number } | null;
  /** Your neighborhood's centre — where the map opens before you've set a spot. */
  center?: { lat: number; lng: number } | null;
}) {
  const [spot, setSpot] = useState(initial);
  const [open, setOpen] = useState(false);
  const changed =
    (spot?.lat ?? null) !== (initial?.lat ?? null) ||
    (spot?.lng ?? null) !== (initial?.lng ?? null);

  return (
    <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">📍 Your spot</h2>
        <span className="text-xs text-black/40 dark:text-white/40">
          Only you can see this
        </span>
      </div>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        {initial
          ? "Your map is centred here. Rounded to about a kilometre — never an address."
          : "Set a rough spot to centre your map. Rounded to about a kilometre, and visible only to you."}
      </p>

      {open ? (
        <div className="mt-3">
          <MapPicker value={spot} onChange={setSpot} center={center} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <form action={setMyLocation}>
              <input type="hidden" name="lat" value={spot?.lat ?? ""} />
              <input type="hidden" name="lng" value={spot?.lng ?? ""} />
              <button
                type="submit"
                disabled={!spot || !changed}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                Save my spot
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setSpot(initial);
                setOpen(false);
              }}
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              Cancel
            </button>
            {initial ? (
              <form action={forgetMyLocation}>
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  Forget my spot
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          {initial ? "Update my spot" : "Set my spot"}
        </button>
      )}
    </section>
  );
}
