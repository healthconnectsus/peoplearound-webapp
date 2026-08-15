import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/unsplash-photos?q=community+garden — three real, freely-licensed
 * photos for the wizard's cover-photo step. The Unsplash API (not "Unsplash
 * Source", which Unsplash shut down) is search-by-keyword, so what's shown
 * actually relates to the category picked, unlike a random-photo service.
 *
 * Requires UNSPLASH_ACCESS_KEY (free, from unsplash.com/developers). Returns
 * 503 when unset so the picker can hide itself rather than error — signed-in
 * gate matches every other AI/external-API route in this app (shape-idea,
 * gardener) to keep the same per-user rate limiting umbrella.
 */
export async function GET(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Stock photos aren't configured yet." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().slice(0, 100) || "neighborhood";

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "Couldn't reach the photo library." },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      results?: {
        id: string;
        urls: { regular: string; thumb: string };
        alt_description: string | null;
        links: { download_location: string };
        user: { name: string; links: { html: string } };
      }[];
    };

    const photos = (data.results ?? []).map((p) => ({
      id: p.id,
      url: p.urls.regular,
      thumb: p.urls.thumb,
      alt: p.alt_description ?? q,
      downloadLocation: p.links.download_location,
      photographer: p.user.name,
      // UTM parameters required by the Unsplash API guidelines whenever a
      // photo or its photographer is credited.
      photographerUrl: `${p.user.links.html}?utm_source=peoplearound&utm_medium=referral`,
    }));

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the photo library." },
      { status: 502 },
    );
  }
}
