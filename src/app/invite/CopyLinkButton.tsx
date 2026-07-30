"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = window.location.origin;
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
      className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
    >
      {copied ? "✓ Link copied" : "Copy invite link"}
    </button>
  );
}
