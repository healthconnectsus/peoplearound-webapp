import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

/**
 * The sitemap exists for one page in particular.
 *
 * `/city/<slug>` was built so a council officer, a librarian or a local
 * reporter could see what a place is building without an account — but today
 * the only way to reach one is to be sent the URL by hand. Nothing links to
 * them and nothing lists them, so nothing finds them. This is the index those
 * pages never got.
 *
 * Read through the ANON key on purpose, not a service role: `public_cities`
 * (migration 0043) is the same view a stranger's browser sees, so the sitemap
 * can only ever contain cities that are already public. If that view is ever
 * tightened, the sitemap tightens with it, with no second place to remember.
 */

// Cities appear as neighborhoods are created — daily is far more often than
// that changes, and it keeps a crawler from re-querying on every visit.
export const revalidate = 86400;

async function citySlugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("public_cities")
      .select("slug")
      .limit(1000);
    if (error || !data) return [];
    return (data as { slug: string | null }[])
      .map((r) => r.slug)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    // A sitemap is not worth failing a deploy over. An empty one is valid,
    // and the static entries below still ship.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await citySlugs();

  // Every public page, and only those. Anything requiring a session is
  // deliberately absent: listing it would advertise a URL that answers a
  // stranger with a redirect.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/start`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/city`, changeFrequency: "weekly", priority: 0.7 },
  ];

  return [
    ...staticPages,
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/city/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
