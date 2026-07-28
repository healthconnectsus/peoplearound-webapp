"use client";

import { useState } from "react";
import { locateNeighborhood } from "./actions";

/**
 * "Use my location" — asks the browser for coordinates and lets the server
 * match them to a neighborhood boundary. Everything degrades to the manual
 * list below, which is always present.
 */
export function LocateButton() {
  const [status, setStatus] = useState<"idle" | "locating">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setMessage(
        "Your browser can't share your location — pick your neighborhood from the list below.",
      );
      return;
    }
    setStatus("locating");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await locateNeighborhood(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        // On success the action redirects; reaching here means it didn't match.
        setStatus("idle");
        if (result?.error) setMessage(result.error);
      },
      () => {
        setStatus("idle");
        setMessage(
          "No problem — pick your neighborhood from the list below instead.",
        );
      },
      { timeout: 10000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={status === "locating"}
        className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        {status === "locating" ? "Looking around…" : "📍 Use my location"}
      </button>
      {message ? (
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {message}
        </p>
      ) : null}
    </div>
  );
}
