"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/image";

const MAX_BYTES = 5 * 1024 * 1024;
export function PhotoPicker({
  userId,
  value,
  onChange,
  label = "Add a photo",
  className = "",
  compact = false,
}: {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
  /** One line instead of a big dashed target, for form-dense steps. */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

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
    const ext = optimized.name.split(".").pop()?.toLowerCase() || "jpg";
    // Unique per upload so replacing a photo never hits a stale CDN copy.
    const path = `${userId}/${Date.now()}-${Math.round(performance.now())}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("projects")
      .upload(path, optimized, {
        upsert: true,
        cacheControl: "31536000", // immutable: paths are unique per upload
      });
    if (upErr) {
      setError(
        /bucket/i.test(upErr.message)
          ? "Photo storage isn't set up yet — apply migration 0021 first."
          : upErr.message,
      );
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("projects").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className={className}>
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

      {value ? (
        <div className="flex flex-col gap-2">
          <div
            aria-hidden
            className="h-40 w-full rounded-xl border border-slate-300 bg-cover bg-center dark:border-slate-600"
            style={{ backgroundImage: `url(${value})` }}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-slate-500 dark:hover:bg-white/10"
            >
              {busy ? "Uploading…" : "Replace photo"}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-black/50 hover:underline dark:text-white/50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void upload(f);
          }}
          className={`flex w-full items-center gap-2 rounded-xl border border-dashed px-4 text-sm font-medium text-black/60 transition-colors hover:border-emerald-500 hover:bg-emerald-50/50 disabled:opacity-50 dark:text-white/60 dark:hover:bg-emerald-950/20 ${
            compact ? "justify-start py-3" : "justify-center py-6"
          } ${
            over
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-slate-400 dark:border-slate-500"
          }`}
        >
          <Camera className="h-4 w-4 shrink-0" aria-hidden />
          {busy ? "Uploading…" : label}
        </button>
      )}

      {error ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
