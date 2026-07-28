"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime for the given tables (comma-separated,
 * kept as a string so the prop is referentially stable across re-renders)
 * and refreshes the current server-rendered route when anything changes.
 * RLS applies to the subscription, so users only get events for rows they
 * can see. Renders nothing.
 */
export function LiveRefresh({ tables }: { tables: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Debounce: a burst of changes (e.g. reconcile + attest) → one refresh.
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 500);
    };

    let channel = supabase.channel(`live-refresh-${tables}`);
    for (const table of tables.split(",")) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: table.trim() },
        refresh,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router, tables]);

  return null;
}
