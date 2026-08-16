import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/unsplash-photos/track — records that a photo was actually
 * chosen. Two jobs:
 *
 * 1. Pings Unsplash's download_location endpoint. Their API guidelines
 *    require this exact call whenever a returned photo is used (not merely
 *    displayed in results), on pain of losing API access — it's how they
 *    count downloads for photographer stats.
 * 2. Logs the use against the picker's city (migration 0035), so the same
 *    photo isn't offered again nearby for a week and a street doesn't end
 *    up with three identical cover images.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let location: string;
  let photoId: string;
  try {
    ({ location, photoId } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Only ever call an Unsplash-hosted URL with our key — never an arbitrary
  // one a client could pass in.
  if (
    typeof location !== "string" ||
    !location.startsWith("https://api.unsplash.com/")
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("neighborhood:neighborhoods!profiles_neighborhood_id_fkey(city)")
    .eq("id", user.id)
    .maybeSingle();
  const city =
    (profileRow as unknown as { neighborhood?: { city: string | null } | null } | null)
      ?.neighborhood?.city ?? null;

  const admin =
    city && typeof photoId === "string" && photoId ? createAdminClient() : null;
  if (admin && city) {
    // Best-effort: a failed log shouldn't block the user's post. The FK to
    // stock_photos means an id we never cached is simply skipped.
    await admin
      .from("stock_photo_uses")
      .insert({ photo_id: photoId, city })
      .then(
        () => {},
        () => {},
      );
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (key) {
    try {
      await fetch(location, { headers: { Authorization: `Client-ID ${key}` } });
    } catch {
      // Best-effort — a failed tracking ping shouldn't block the user.
    }
  }
  return NextResponse.json({ ok: true });
}
