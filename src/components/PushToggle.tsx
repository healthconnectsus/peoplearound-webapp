"use client";

import { useEffect, useState } from "react";

/** URL-safe base64 → Uint8Array, the form PushManager wants the VAPID key in. */
function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "off" | "on" | "blocked" | "working";

/**
 * Push notifications, opt-in and reversible in one tap.
 *
 * We never call requestPermission on page load — the browser prompt only
 * appears after a deliberate click here, because a permission dialog someone
 * didn't ask for is denied forever and costs the channel permanently.
 */
export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    // Resolved asynchronously (including the synchronous capability checks) so
    // the first paint is always the neutral "loading" nothing.
    (async () => {
      if (
        !vapidKey ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const endpoint = sub?.endpoint;
      await sub?.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    } catch {
      // fall through — the server side is what actually stops the pushes
    }
    setState("off");
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="text-xs text-black/45 dark:text-white/45">
        This browser can&rsquo;t do push notifications. On iPhone, add
        Peoplearound to your home screen first.
      </p>
    );
  }

  if (state === "blocked") {
    return (
      <p className="text-xs text-black/45 dark:text-white/45">
        Notifications are blocked for this site in your browser settings. You
        can turn them back on there.
      </p>
    );
  }

  const on = state === "on";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={state === "working"}
        onClick={on ? disable : enable}
        className={
          on
            ? "rounded-full border border-slate-300 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-slate-500 dark:hover:bg-white/10"
            : "rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        }
      >
        {state === "working" ? "…" : on ? "Turn off" : "Turn on"}
      </button>
      <span className="text-xs text-black/45 dark:text-white/45">
        {on
          ? "On — you'll hear when someone joins, helps, or plans something."
          : "Off — nothing reaches your phone."}
      </span>
    </div>
  );
}
