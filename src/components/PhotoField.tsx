"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";

/**
 * A photo picker that can live inside a plain server-action form.
 *
 * `PhotoPicker` is a controlled component: it uploads and hands back a URL,
 * and something has to hold that URL. Where a whole form is already a client
 * component (the update composer, the wizards) that is just local state. The
 * event form is not — it is server-rendered markup posting straight to a
 * server action — and turning the whole thing into a client component to
 * carry one string would be the wrong trade.
 *
 * So this is the smallest possible client island: it owns the URL and writes
 * it into a hidden input, which is what the form submits.
 */
export function PhotoField({
  userId,
  name = "photoUrl",
  label = "Add a photo",
  className = "",
  compact = true,
}: {
  userId: string;
  /** Form field the URL is submitted under. */
  name?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  return (
    <>
      <input type="hidden" name={name} value={url ?? ""} />
      <PhotoPicker
        userId={userId}
        value={url}
        onChange={setUrl}
        label={label}
        className={className}
        compact={compact}
      />
    </>
  );
}
