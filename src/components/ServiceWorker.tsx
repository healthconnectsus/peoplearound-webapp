"use client";

import { useEffect } from "react";

/** Registers the service worker once, after the page is interactive. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registering during load contends with the app's own requests; wait.
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration costs nothing — the app works without it.
      });
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
