/**
 * Image cost controls (see docs/SCALING.md).
 *
 * Storage egress is the largest raw line item at scale, and it is almost
 * entirely self-inflicted: phone cameras produce 3–5 MB files and feeds
 * render them at a few hundred pixels. Two levers, both here:
 *   1. shrinkImage() — re-encode in the browser BEFORE upload (~10× smaller).
 *   2. thumbUrl()    — request a resized variant at render time, so a feed
 *      card doesn't download a hero-sized photo.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

/** Browser-only: downscale and re-encode. Returns the original on failure. */
export async function shrinkImage(file: File): Promise<File> {
  if (typeof window === "undefined" || !("createImageBitmap" in window)) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 400 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

/**
 * A width-constrained variant of a Supabase Storage public URL.
 * Image transformations are a paid Supabase feature, so this is opt-in via
 * NEXT_PUBLIC_IMAGE_TRANSFORM=on — until then it returns the URL unchanged
 * (uploads are already downscaled, so this is an optimization, not a
 * correctness requirement).
 */
export function thumbUrl(url: string | null | undefined, width = 800) {
  if (!url) return url ?? null;
  if (process.env.NEXT_PUBLIC_IMAGE_TRANSFORM !== "on") return url;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const rendered = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=${width}&quality=75`;
}
