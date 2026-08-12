"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pa-install-dismissed";

/**
 * A quiet, one-line invitation to install — shown only when the browser has
 * decided the app is installable, and never again once dismissed. No modal,
 * no interstitial: an app that nags to be installed hasn't earned it yet.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setDeferred(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-400 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-500 dark:bg-zinc-900/95 lg:hidden">
      <span className="text-xl" aria-hidden>
        🏘️
      </span>
      <p className="min-w-0 flex-1 text-sm">
        Keep your neighborhood one tap away.
      </p>
      <button
        type="button"
        onClick={async () => {
          const e = deferred;
          setDeferred(null);
          localStorage.setItem(DISMISS_KEY, "1");
          await e.prompt();
        }}
        className="shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="shrink-0 rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
