"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Teaser = { id: string; name: string; neighbors: number; ideas: number };

/**
 * Logged-out location hook: on mount, asks the browser for the visitor's
 * location (this is what triggers the native permission popup), then matches
 * it to a neighborhood via the anon-safe locate_teaser RPC and shows a warm
 * local teaser under the sign-up card. The matched neighborhood id is kept
 * in a cookie so the account gets it automatically after sign-up.
 * Denied / unsupported / no match with nothing nearby → renders nothing.
 */
export function AutoLocate() {
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const supabase = createClient();
        const { data } = await supabase.rpc("locate_teaser", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        const row = (data as Teaser[] | null)?.[0];
        if (row) {
          setTeaser(row);
          // Remembered for two weeks so sign-up lands in the right place.
          document.cookie = `pa-hood=${row.id}; path=/; max-age=1209600; samesite=lax`;
        } else {
          setNoMatch(true);
        }
      },
      () => {
        /* Declined or unavailable — stay quiet, never nag. */
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  if (!teaser && !noMatch) return null;

  return (
    <div className="mt-4 rounded-xl border border-emerald-600/25 bg-emerald-50/90 px-4 py-3 text-sm shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/60">
      {teaser ? (
        <p className="text-emerald-900 dark:text-emerald-200">
          📍 You&apos;re near <strong>{teaser.name}</strong>
          {teaser.neighbors > 0 || teaser.ideas > 0 ? (
            <>
              {" — "}
              {teaser.neighbors}{" "}
              {teaser.neighbors === 1 ? "neighbor is" : "neighbors are"} already
              here, building {teaser.ideas}{" "}
              {teaser.ideas === 1 ? "idea" : "ideas"}.
            </>
          ) : (
            "."
          )}{" "}
          Join them — your account will start right in your neighborhood.
        </p>
      ) : (
        <p className="text-emerald-900 dark:text-emerald-200">
          📍 No Peoplearound neighborhood here yet — sign up and be the one
          who starts yours.
        </p>
      )}
    </div>
  );
}
