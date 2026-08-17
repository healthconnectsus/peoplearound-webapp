/**
 * The basemap, from the environment — one definition for both map views.
 *
 * Three ways to configure it, in order of preference:
 *
 * 1. `NEXT_PUBLIC_MAPBOX_TOKEN` (+ optional `NEXT_PUBLIC_MAP_STYLE`).
 *    The URL, the 512px tile size, the retina suffix and the attribution
 *    are all derived. Trying a different look is one word — and there's no
 *    long URL to paste, which is what broke the first attempt: the variable
 *    held only the token, so Leaflet requested it as a relative path and
 *    got the site's 404 page back.
 *
 * 2. `NEXT_PUBLIC_MAP_TILE_URL` (+ `_TILE_SIZE`, `_ATTRIBUTION`) for any
 *    other raster provider — Stadia, MapTiler, Carto.
 *
 * 3. Nothing: OpenStreetMap, so the app runs with no account and no key.
 *    Fine for local work; OSM's usage policy doesn't cover real traffic.
 *
 * The token ships to the browser either way, so it must be URL-restricted
 * in the Mapbox dashboard — a public token with no referrer allow-list is
 * somebody else's free map quota.
 */

/** Mapbox styles worth trying, quietest first. */
export const MAP_STYLES = {
  "light-v11": "Muted greys, almost no labels — pins carry everything",
  "streets-v12": "Coloured roads, green parks, blue water — a map that reads as a map",
  "outdoors-v12": "Streets plus terrain and trails; greenest of the set",
  "navigation-day-v1": "High-contrast roads, built for wayfinding",
  "satellite-streets-v12": "Aerial imagery with street labels over it",
} as const;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE || "streets-v12";

const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  (MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : OSM_URL);

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  (MAPBOX_TOKEN ? MAPBOX_ATTRIBUTION : OSM_ATTRIBUTION);

/**
 * Mapbox serves 512px tiles; Leaflet assumes 256. Left at the default,
 * every label and road renders at half scale — a map that looks subtly
 * "zoomed wrong" with no obvious cause.
 */
export const TILE_SIZE =
  Number(process.env.NEXT_PUBLIC_MAP_TILE_SIZE) || (MAPBOX_TOKEN ? 512 : 256);

/** 512px tiles need this offset so Leaflet's zoom levels still line up. */
export const TILE_ZOOM_OFFSET = TILE_SIZE === 512 ? -1 : 0;
