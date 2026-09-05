"use client";

import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { postUpdate } from "../updateActions";
import { updateProjectDetails } from "../actions";

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
      className="rounded-2xl border border-slate-400 p-4 dark:border-slate-500"
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
        className="mt-3 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400"
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
        className="mt-3 rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
      >
        Post update
      </SubmitButton>
    </form>
  );
}

/** Founder-only editor for what the project says and looks like. */
export function ProjectEditor({
  projectId,
  userId,
  title,
  description,
  whenText,
  photoUrl,
}: {
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  whenText: string | null;
  photoUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(photoUrl);

  return (
    <form
      action={updateProjectDetails}
      className="rounded-2xl border border-slate-400 p-4 dark:border-slate-500"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="photoUrl" value={url ?? ""} />
      <h3 className="text-sm font-semibold">Edit project</h3>

      <label className="mt-3 block text-xs text-black/50 dark:text-white/50">
        Title
        <input
          type="text"
          name="title"
          required
          maxLength={140}
          defaultValue={title}
          className="mt-1 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm text-black outline-none focus:border-emerald-600 dark:border-slate-400 dark:text-white"
        />
      </label>

      <label className="mt-3 block text-xs text-black/50 dark:text-white/50">
        Description
        <textarea
          name="description"
          rows={5}
          maxLength={4000}
          defaultValue={description ?? ""}
          className="mt-1 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm text-black outline-none focus:border-emerald-600 dark:border-slate-400 dark:text-white"
        />
      </label>

      <label className="mt-3 block text-xs text-black/50 dark:text-white/50">
        When it happens
        <input
          type="text"
          name="whenText"
          maxLength={80}
          defaultValue={whenText ?? ""}
          placeholder="e.g. Saturday mornings"
          className="mt-1 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm text-black outline-none focus:border-emerald-600 dark:border-slate-400 dark:text-white"
        />
      </label>

      <div className="mt-3">
        <PhotoPicker
          userId={userId}
          value={url}
          onChange={setUrl}
          label="Cover photo"
        />
      </div>

      <SubmitButton
        pendingLabel="Saving…"
        className="mt-3 rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover"
      >
        Save changes
      </SubmitButton>
    </form>
  );
}
