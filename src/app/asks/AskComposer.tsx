"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { MapPicker } from "@/components/MapPicker";
import { postAsk } from "./askActions";

/**
 * One screen, four fields, no wizard. A person who needs a hand for twenty
 * minutes will not complete a four-step flow — and shouldn't have to.
 */

const MINUTES = [
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "Half a day" },
];

const EXAMPLES = [
  "Move a sofa into the living room",
  "Hold a ladder while I clear the gutter",
  "Jump-start my car",
  "Carry a mattress up two flights",
  "Watch the dog for an hour",
  "Read a letter I don't understand",
];

export function AskComposer({
  userId,
  startOpen = false,
  center = null,
}: {
  userId: string;
  /** The sidebar's "Ask for small help" lands here with the form already up. */
  startOpen?: boolean;
  /** Opens the pin map on your neighborhood rather than the whole planet. */
  center?: { lat: number; lng: number } | null;
}) {
  const [open, setOpen] = useState(startOpen);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-emerald-600/40 bg-emerald-50/50 px-5 py-4 text-left transition-colors hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
      >
        <span className="text-base font-semibold">
          🙋 Ask for a hand
        </span>
        <span className="mt-0.5 block text-sm text-black/55 dark:text-white/55">
          Twenty minutes of someone&rsquo;s time is not a big favor. Ask.
        </span>
      </button>
    );
  }

  return (
    <form
      action={postAsk}
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900"
    >
      <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
      <input type="hidden" name="lat" value={spot?.lat ?? ""} />
      <input type="hidden" name="lng" value={spot?.lng ?? ""} />

      <h2 className="text-lg font-bold">What do you need a hand with?</h2>

      <input
        type="text"
        name="title"
        required
        maxLength={140}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. “Move a sofa into the living room”"
        className="mt-3 w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setTitle(e)}
            className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/55 transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:border-white/15 dark:text-white/55 dark:hover:text-emerald-400"
          >
            {e}
          </button>
        ))}
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">
          Roughly how long will it take?
        </legend>
        <p className="mb-2 mt-0.5 text-xs text-black/50 dark:text-white/50">
          The honest number is the whole trick — people say yes to a number
          they can picture.
        </p>
        <div className="flex flex-wrap gap-2">
          {MINUTES.map((m, i) => (
            <label
              key={m.value}
              className="cursor-pointer rounded-full border border-black/15 px-4 py-1.5 text-sm transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:font-semibold has-[:checked]:text-emerald-800 dark:border-white/20 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40 dark:has-[:checked]:text-emerald-300"
            >
              <input
                type="radio"
                name="minutes"
                value={m.value}
                defaultChecked={i === 2}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <input
        type="text"
        name="whenText"
        maxLength={80}
        placeholder="When? e.g. “Any evening this week” (optional)"
        className="mt-4 w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
      />
      <textarea
        name="description"
        rows={2}
        maxLength={2000}
        placeholder="Anything useful — how heavy, how many people, third floor no lift (optional)"
        className="mt-2 w-full resize-y rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
      />
      <input
        type="text"
        name="place"
        maxLength={120}
        placeholder="Roughly where? e.g. “5th & Oak” (optional)"
        className="mt-2 w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-white/20"
      />

      <div className="mt-3">
        <p className="mb-1.5 text-xs text-black/50 dark:text-white/50">
          Drop a rough pin so neighbors can see if it&rsquo;s near them — a
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

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Post the ask
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-black/45 hover:underline dark:text-white/45"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
