"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { postUpdate, setProjectPhoto } from "../updateActions";

/** Post a progress note (optionally with a photo) to the project's log. */
export function UpdateComposer({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  return (
    <form
      action={postUpdate}
      className="border border-slate-400 p-4 dark:border-slate-500"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
      <h3 className="text-sm font-semibold">Post an update</h3>
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
        What moved this week? Neighbors following along will see it.
      </p>
      <textarea
        name="body"
        required
        rows={3}
        maxLength={2000}
        placeholder="e.g. “We got the permit — planting day is on!”"
        className="mt-3 w-full border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
      />
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
        className="mt-3 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Post update
      </SubmitButton>
    </form>
  );
}

/** Founder-only cover photo control on the project page. */
export function ProjectPhotoEditor({
  projectId,
  userId,
  photoUrl,
}: {
  projectId: string;
  userId: string;
  photoUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(photoUrl);
  const changed = (url ?? "") !== (photoUrl ?? "");

  return (
    <form action={setProjectPhoto}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="photoUrl" value={url ?? ""} />
      <PhotoPicker
        userId={userId}
        value={url}
        onChange={setUrl}
        label="Add a cover photo"
      />
      {changed ? (
        <button
          type="submit"
          className="mt-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Save photo
        </button>
      ) : null}
    </form>
  );
}
