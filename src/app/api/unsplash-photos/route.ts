import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/unsplash-photos?q=community+garden — three real, freely-licensed
 * photos for the wizard's cover-photo step.
 *
 * Cache-first (migration 0035): a query's results are stored on first fetch
 * and reused forever after, because Unsplash's free tier is 50 requests/hour
 * and every neighbor opening the wizard was burning one to see the same
 * three photos. We only call Unsplash when a query has no usable cached rows
 * left after the recency filter below.
 *
 * Recency filter: a photo already used in this city within the last 7 days
 * is withheld, so a street doesn't end up with the same picture on three
 * posts. We over-fetch (12) and cache all of them precisely so there's
 * something left to offer once the recent ones are excluded.
 */

const RECENT_DAYS = 7;
const WANT = 3;
const FETCH_COUNT = 12;

type CachedPhoto = {
  id: string;
  url: string;
  thumb: string;
  alt: string | null;
  download_location: string;
  photographer: string;
  photographer_url: string;
};

function toClient(p: CachedPhoto) {
  return {
    id: p.id,
    url: p.url,
    thumb: p.thumb,
    alt: p.alt ?? "",
    downloadLocation: p.download_location,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
  };
}

export async function GET(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().slice(0, 100).toLowerCase() || "neighborhood";

  // The asker's city decides which photos are "recently used nearby".
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("neighborhood:neighborhoods!profiles_neighborhood_id_fkey(city)")
    .eq("id", user.id)
    .maybeSingle();
  const city =
    (profileRow as unknown as { neighborhood?: { city: string | null } | null } | null)
      ?.neighborhood?.city ?? null;

  const since = new Date(Date.now() - RECENT_DAYS * 86400_000).toISOString();
  const recentlyUsed = new Set<string>();
  if (city) {
    const { data: uses } = await supabase
      .from("stock_photo_uses")
      .select("photo_id")
      .eq("city", city)
      .gte("used_at", since);
    for (const u of (uses ?? []) as { photo_id: string }[]) {
      recentlyUsed.add(u.photo_id);
    }
  }

  // 1. Try the cache first.
  const { data: cachedRows } = await supabase
    .from("stock_photos")
    .select("id,url,thumb,alt,download_location,photographer,photographer_url")
    .eq("query", q)
    .order("fetched_at", { ascending: false })
    .limit(60);
  const cached = ((cachedRows ?? []) as CachedPhoto[]).filter(
    (p) => !recentlyUsed.has(p.id),
  );
  if (cached.length >= WANT) {
    return NextResponse.json({ photos: cached.slice(0, WANT).map(toClient) });
  }

  // 2. Cache is short — go to Unsplash (if configured) and top it up.
  if (!key) {
    return cached.length > 0
      ? NextResponse.json({ photos: cached.map(toClient) })
      : NextResponse.json(
          { error: "Stock photos aren't configured yet." },
          { status: 503 },
        );
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${FETCH_COUNT}&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      // Serve whatever the cache has rather than failing the step outright.
      return NextResponse.json({ photos: cached.map(toClient) });
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

    const rows: CachedPhoto[] = (data.results ?? []).map((p) => ({
      id: p.id,
      url: p.urls.regular,
      thumb: p.urls.thumb,
      alt: p.alt_description,
      download_location: p.links.download_location,
      photographer: p.user.name,
      // UTM parameters required by the Unsplash API guidelines wherever a
      // photo or its photographer is credited.
      photographer_url: `${p.user.links.html}?utm_source=peoplearound&utm_medium=referral`,
    }));

    // Service role: the cache is operator data, not user content. Null when
    // the key isn't configured — we just skip caching and still serve.
    const admin = rows.length > 0 ? createAdminClient() : null;
    if (admin) {
      await admin
        .from("stock_photos")
        .upsert(
          rows.map((r) => ({ ...r, query: q })),
          { onConflict: "id", ignoreDuplicates: false },
        );
    }

    const fresh = rows.filter((p) => !recentlyUsed.has(p.id));
    // Cached-but-not-recent first (they're already paid for), then new ones.
    const merged = [...cached, ...fresh.filter((f) => !cached.some((c) => c.id === f.id))];
    return NextResponse.json({ photos: merged.slice(0, WANT).map(toClient) });
  } catch {
    return NextResponse.json({ photos: cached.map(toClient) });
  }
}
