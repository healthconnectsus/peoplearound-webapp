"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/projects";
import { shrinkImage } from "@/lib/image";

const MAX_BYTES = 5 * 1024 * 1024;

function usePhotoUpload(userId: string, kind: "avatar" | "cover") {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5 MB");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const optimized = await shrinkImage(file);
    // Extension must describe the BYTES we're storing: shrinkImage re-encodes
    // to JPEG, so a .png path would hold JPEG data.
    const ext = optimized.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${kind}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("profiles")
      .upload(path, optimized, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setError(
        /bucket/i.test(upErr.message)
          ? "Photo storage isn't set up yet — apply migration 0010 first."
          : upErr.message,
      );
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await supabase
      .from("profiles")
      .update(kind === "avatar" ? { avatar_url: url } : { cover_url: url })
      .eq("id", userId);
    if (dbErr) {
      setError(dbErr.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return { busy, error, upload };
}

export function CoverUpload({
  userId,
  coverUrl,
}: {
  userId: string;
  coverUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, upload } = usePhotoUpload(userId, "cover");

  return (
    <div
      className="relative h-40 bg-gradient-to-r from-emerald-100 via-sky-100 to-violet-100 bg-cover bg-center dark:from-emerald-950 dark:via-sky-950 dark:to-violet-950"
      style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/75 disabled:opacity-60"
      >
        <Camera className="h-4 w-4" aria-hidden />
        {busy ? "Uploading…" : "Upload cover photo"}
      </button>
      {error ? (
        <p className="absolute inset-x-0 bottom-1 text-center text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, upload } = usePhotoUpload(userId, "avatar");

  return (
    <div className="relative -mt-10 inline-block">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, unoptimized is fine
        <img
          src={avatarUrl}
          alt=""
          className="h-24 w-24 rounded-full border-4 border-white object-cover dark:border-zinc-900"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-2xl font-semibold text-emerald-800 dark:border-zinc-900 dark:bg-emerald-900 dark:text-emerald-200">
          {initials(name)}
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile photo"
        className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-black/15 bg-white text-black/70 shadow-sm transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-white/15 dark:bg-zinc-800 dark:text-white/70 dark:hover:bg-zinc-700"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      {error ? (
        <p className="mt-1 max-w-[12rem] text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
