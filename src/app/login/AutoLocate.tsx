"use client";

import { useEffect, useState } from "react";

type Teaser = { id: string; name: string; neighbors: number; ideas: number };
type Preview = { name: string };

function rememberHood(id: string) {
  // Remembered for two weeks so sign-up lands in the right place.
  document.cookie = `pa-hood=${id}; path=/; max-age=1209600; samesite=lax`;
}

function rememberFrontier(lat: number, lng: number) {
  // Somewhere new: the place is only created once they actually sign up —
  // the home page claims these coordinates on the first signed-in visit.
  document.cookie = `pa-frontier=${lat.toFixed(5)},${lng.toFixed(5)}; path=/; max-age=1209600; samesite=lax`;
}

/**
 * Logged-out location hook: on mount, asks the browser for the visitor's
 * location (this is what triggers the native permission popup), sends it to
 * /api/register-location in preview mode — which matches it to a
 * neighborhood, or names the place if there is none — and shows a warm local
 * teaser under the sign-up card. The matched neighborhood id is kept in a
 * cookie so the account gets it automatically after sign-up.
 * Denied / unsupported / no match with nothing nearby → renders nothing.
 *
 * It used to call the locate_teaser RPC itself through the Supabase client,
 * and fall back to this route only for unknown places. That one import put
 * the entire client library — auth, realtime, PostgREST — into the front
 * door's JavaScript: 64 KB compressed, on the page every stranger lands on,
 * to make one request the server was already able to make for it.
 */
export function AutoLocate() {
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [frontier, setFrontier] = useState<Preview | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // One request. A known place comes back with its counts; somewhere
        // new comes back as a name only — nothing is created until they
        // sign up, and that is the anti-spam wall.
        try {
          const res = await fetch("/api/register-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              preview: true,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as
              | (Teaser & { created: boolean })
              | { name: string; preview: true };
            if ("preview" in data) {
              setFrontier({ name: data.name });
              rememberFrontier(pos.coords.latitude, pos.coords.longitude);
            } else {
              setTeaser({
                id: data.id,
                name: data.name,
                neighbors: data.neighbors ?? 0,
                ideas: data.ideas ?? 0,
              });
              rememberHood(data.id);
            }
            return;
          }
        } catch {
          /* fall through to the quiet no-match note */
        }
        setNoMatch(true);
      },
      () => {
        /* Declined or unavailable — stay quiet, never nag. */
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  if (!teaser && !frontier && !noMatch) return null;

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
      ) : frontier ? (
        <p className="text-emerald-900 dark:text-emerald-200">
          🎉 You&apos;re in <strong>{frontier.name}</strong> — brand new to
          Peoplearound! Sign up to put it on the map and be its first
          neighbor.
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
