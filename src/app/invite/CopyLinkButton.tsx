"use client";

import { useState } from "react";

/**
 * Copies the user's PERSONAL invite link (?via=<id>) — sign-ups through it
 * are attributed to them ("brought N neighbors here").
 */
export function CopyLinkButton({ userId }: { userId?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = userId
      ? `${window.location.origin}/login?via=${userId}`
      : window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, http) — show the URL instead.
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
    >
      {copied ? "✓ Link copied" : "Copy invite link"}
    </button>
  );
}
