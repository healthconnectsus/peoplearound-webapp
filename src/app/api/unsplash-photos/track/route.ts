import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/unsplash-photos/track — pings Unsplash's download_location
 * endpoint. The Unsplash API guidelines require this exact call whenever a
 * photo returned by the API is actually used (not just displayed in search
 * results), on pain of losing API access — it's how they count "downloads"
 * for photographer stats. Server-side only: it needs the same Client-ID key
 * as the search, which stays out of the browser.
 */
export async function POST(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ ok: false }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let location: string;
  try {
    ({ location } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Only ever call an Unsplash-hosted URL with our key — never an arbitrary
  // one a client could pass in.
  if (typeof location !== "string" || !location.startsWith("https://api.unsplash.com/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await fetch(location, { headers: { Authorization: `Client-ID ${key}` } });
  } catch {
    // Best-effort — a failed tracking ping shouldn't block the user's post.
  }
  return NextResponse.json({ ok: true });
}
