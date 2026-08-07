"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      if (channel) return;
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
      if (!channel) return;
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

    if (document.visibilityState === "visible") subscribe();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [router, tables]);

  return null;
}
