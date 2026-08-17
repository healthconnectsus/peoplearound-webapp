"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { MapPicker } from "@/components/MapPicker";
import { postOffer } from "./offerActions";

const KINDS = [
  { value: "give", emoji: "🎁", label: "Give away", hint: "Yours to keep" },
  { value: "lend", emoji: "🔁", label: "Lend", hint: "Borrow and return" },
  { value: "offer", emoji: "🙌", label: "Offer a skill", hint: "A hand, an hour" },
];

export function OfferComposer({
  userId,
  center = null,
}: {
  userId: string;
  /** Opens the pin map on your neighborhood rather than the whole planet. */
  center?: { lat: number; lng: number } | null;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <form
      action={postOffer}
      className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
    >
      <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
      <input type="hidden" name="lat" value={spot?.lat ?? ""} />
      <input type="hidden" name="lng" value={spot?.lng ?? ""} />
      <h2 className="text-lg font-bold">Share something</h2>
      <p className="mt-0.5 text-sm text-black/50 dark:text-white/50">
        A tool, a truck for a day, soil, an hour of help. No money — just
        neighbors.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {KINDS.map((k, i) => (
          <label
            key={k.value}
            className="flex flex-1 cursor-pointer flex-col gap-0.5 rounded-xl border border-slate-400 px-4 py-3 text-sm transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:border-slate-400 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40"
          >
            <input
              type="radio"
              name="kind"
              value={k.value}
              defaultChecked={i === 0}
              className="sr-only"
            />
            <span className="font-medium">
              {k.emoji} {k.label}
            </span>
            <span className="text-xs text-black/50 dark:text-white/50">
              {k.hint}
            </span>
          </label>
        ))}
      </div>

      <input
        type="text"
        name="title"
        required
        maxLength={140}
        placeholder="What is it? e.g. “Extension ladder, free to borrow”"
        className="mt-3 w-full rounded-xl border border-slate-400 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
      />
      <textarea
        name="description"
        rows={2}
        maxLength={2000}
        placeholder="Anything useful — condition, when you're around, how to reach you"
        className="mt-2 w-full resize-y rounded-xl border border-slate-400 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
      />
      <input
        type="text"
        name="place"
        maxLength={120}
        placeholder="Roughly where? e.g. “5th & Oak” (optional)"
        className="mt-2 w-full rounded-xl border border-slate-400 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
      />
      <div className="mt-2">
        <p className="mb-1.5 text-xs text-black/50 dark:text-white/50">
          Drop a rough pin so neighbors can see if it&apos;s near them — pick a
          corner or a block, not your door. We round it to about 110 m.
        </p>
        <MapPicker value={spot} onChange={setSpot} center={center} />
      </div>
      <div className="mt-2">
        <PhotoPicker
          userId={userId}
          value={photoUrl}
          onChange={setPhotoUrl}
          label="Add a photo (optional)"
        />
      </div>
      <SubmitButton
        pendingLabel="Posting…"
        className="mt-3 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Post it
      </SubmitButton>
    </form>
  );
}
