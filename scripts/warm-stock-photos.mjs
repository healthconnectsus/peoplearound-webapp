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

// Must match the photoQuery values in src/app/projects/new/IdeaForm.tsx —
// the wizard searches by *activity*, not by category label, because
// "Social neighborhood" returned random streetscapes for a walking group.
// Every query names the people doing the thing, so covers show a group
// rather than an empty street.
const QUERIES = [
  "group of adults laughing together",
  "group of adult volunteers",
  "group of adults working together",
  "group of adults playing board games",
  "group of adults exercising in a park",
  "group of adults at a concert",
  "group of adults sharing dinner",
  "group of adults talking over coffee",
  "group of adults walking in a park",
  "adult volunteers planting a garden",
  "adults repairing tools in a workshop",
  "adults painting a mural",
  "adults in a workshop class",
  "adult volunteers at a food bank",
  "adults at a street party",
  "adults building together in a workshop",
  "adults at a market stall",
  "group of adults running together",
  "adults playing a board game",
  "adult teaching a skill in a workshop",
  "group of adults together",
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
