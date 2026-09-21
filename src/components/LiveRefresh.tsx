"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type BrowserClient = ReturnType<
  typeof import("@/lib/supabase/client").createClient
>;
type Channel = ReturnType<BrowserClient["channel"]>;

/**
 * Keeps a server-rendered page fresh without polling every viewer.
 *
 * Scaling notes (see docs/SCALING.md — realtime is the first wall we hit):
 *  • Each entry may carry a server-side filter — "messages:conversation_id=eq.X"
 *    — so Postgres only pushes rows this page actually cares about instead of
 *    every row in the table.
 *  • Subscriptions are dropped while the tab is hidden and re-established on
 *    return, which removes the long tail of forgotten background tabs (the
 *    bulk of concurrent subscribers in a social app).
 *  • Refreshes are debounced and rate-limited, so a burst of writes costs one
 *    re-render, not one per event.
 *  • Set NEXT_PUBLIC_REALTIME=off to fall back to visibility-aware polling
 *    (cheap escape hatch if realtime ever gets expensive before the
 *    Broadcast rewrite).
 */

const DEBOUNCE_MS = 1200;
const MIN_GAP_MS = 5000; // never re-render more than once per 5s
const MAX_WAIT_MS = 10000; // …but never postpone longer than this
const POLL_MS = 60000;

export function LiveRefresh({ tables }: { tables: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;
    let pendingSince = 0; // when the current burst started
    let disposed = false;

    const run = () => {
      timer = null;
      pendingSince = 0;
      if (disposed || document.visibilityState !== "visible") return;
      lastRun = Date.now();
      router.refresh();
    };

    const refresh = () => {
      const now = Date.now();
      if (!pendingSince) pendingSince = now;
      // A continuous stream (a hot chat) must not postpone forever: cap the
      // total wait, so the page still updates mid-burst.
      const deadline = pendingSince + MAX_WAIT_MS;
      const wait = Math.min(
        Math.max(DEBOUNCE_MS, MIN_GAP_MS - (now - lastRun)),
        Math.max(0, deadline - now),
      );
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, wait);
    };

    // --- Polling fallback -------------------------------------------------
    if (process.env.NEXT_PUBLIC_REALTIME === "off") {
      const id = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, POLL_MS);
      return () => clearInterval(id);
    }

    // --- Realtime ---------------------------------------------------------
    // The client library is imported here, after mount, rather than with
    // the page. It is the largest dependency in the browser bundle — auth,
    // realtime and PostgREST together — and only the three pages that
    // subscribe need it, once the page is already on screen.
    let supabase: BrowserClient | null = null;
    let channel: Channel | null = null;

    const subscribe = () => {
      if (channel || !supabase) return;
      let ch = supabase.channel(`live:${tables}`);
      for (const entry of tables.split(",")) {
        const [table, filter] = entry.trim().split(":");
        if (!table) continue;
        ch = ch.on(
          "postgres_changes",
          filter
            ? { event: "*", schema: "public", table, filter }
            : { event: "*", schema: "public", table },
          refresh,
        );
      }
      ch.subscribe();
      channel = ch;
    };

    const unsubscribe = () => {
      if (!channel || !supabase) return;
      supabase.removeChannel(channel);
      channel = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        subscribe();
        // Catch up on anything missed while the tab was hidden.
        refresh();
      } else {
        unsubscribe();
        if (timer) clearTimeout(timer);
      }
    };

    import("@/lib/supabase/client").then(({ createClient }) => {
      // Unmounted while the chunk was in flight: subscribe to nothing.
      if (disposed) return;
      supabase = createClient();
      if (document.visibilityState === "visible") subscribe();
      document.addEventListener("visibilitychange", onVisibility);
    });

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [router, tables]);

  return null;
}
