/**
 * Pre-warm the stock-photo cache (migration 0035).
 *
 * Fetches Unsplash's maximum 30 photos for every category the wizard can
 * search and stores them, so no neighbor ever waits on a live API call and
 * our hourly quota is spent deliberately here rather than accidentally by
 * whoever happens to open the wizard first.
 *
 * Only photo *metadata* is stored — id, CDN urls, photographer, tracking
 * link. The image files themselves stay on Unsplash's CDN because their API
 * guidelines require hotlinking rather than re-hosting.
 *
 *   node scripts/warm-stock-photos.mjs
 */
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const UNSPLASH = env.UNSPLASH_ACCESS_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!UNSPLASH || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ Missing UNSPLASH_ACCESS_KEY / Supabase env");
  process.exit(1);
}

// Must match CATEGORY_META labels in src/lib/projects.ts — the wizard
// searches `${label} neighborhood`.
const QUERIES = [
  "Community neighborhood",
  "Games neighborhood",
  "Fitness neighborhood",
  "Outdoors neighborhood",
  "Food & drink neighborhood",
  "Social neighborhood",
  "Arts & music neighborhood",
  "Learning neighborhood",
  "Events neighborhood",
  "Giving neighborhood",
  "Home neighborhood",
  "Venture neighborhood",
  // "Other neighborhood" isn't a phrase anyone photographs — it returned a
  // single result. IdeaForm substitutes this term for the Other category.
  "neighbors together",
];

let totalRows = 0;
for (const label of QUERIES) {
  const query = label.toLowerCase();
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${UNSPLASH}` } },
  );
  if (!res.ok) {
    console.error(`✗ ${query}: HTTP ${res.status}`);
    continue;
  }
  const remaining = res.headers.get("x-ratelimit-remaining");
  const { results = [] } = await res.json();
  const rows = results.map((p) => ({
    id: p.id,
    url: p.urls.regular,
    thumb: p.urls.thumb,
    alt: p.alt_description,
    download_location: p.links.download_location,
    photographer: p.user.name,
    photographer_url: `${p.user.links.html}?utm_source=peoplearound&utm_medium=referral`,
  }));

  const up = await fetch(`${SUPABASE_URL}/rest/v1/stock_photos?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!up.ok) {
    console.error(`✗ ${query}: upsert ${up.status} ${await up.text()}`);
    continue;
  }

  // Link each photo to this search (migration 0036). Separate from the
  // photo rows so one photo can answer several queries.
  const link = await fetch(
    `${SUPABASE_URL}/rest/v1/stock_photo_queries?on_conflict=photo_id,query`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify(rows.map((r) => ({ photo_id: r.id, query }))),
    },
  );
  if (!link.ok) {
    console.error(`✗ ${query}: link ${link.status} ${await link.text()}`);
    continue;
  }
  totalRows += rows.length;
  console.log(`✓ ${query.padEnd(28)} ${rows.length} photos  (quota left: ${remaining})`);
}
console.log(`\n${totalRows} photos cached.`);
