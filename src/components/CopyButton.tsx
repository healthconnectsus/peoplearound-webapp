"use client";

import { useState } from "react";

/**
 * Copies a piece of text — a share link, a code — and says it did.
 *
 * The clipboard is unavailable often enough to matter (a browser that
 * refuses permission, an insecure origin, an old phone), so the fallback is
 * a prompt with the text selected, which is still better than nothing to
 * copy at all.
 */
export function CopyButton({
  text,
  label = "Copy link",
  copiedLabel = "✓ Copied",
  className = "",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this", text);
        }
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
