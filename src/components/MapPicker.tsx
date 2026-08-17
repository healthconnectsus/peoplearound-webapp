"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/**
 * The basemap, from the environment.
 *
 * Defaults to OpenStreetMap so the app runs with no account and no key —
 * but OSM's usage policy doesn't cover real traffic, so a launch sets these.
 * For Mapbox raster tiles (works with Leaflet, unlike Mapbox GL):
 *
 *   NEXT_PUBLIC_MAP_TILE_URL=https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x?access_token=pk.…
 *   NEXT_PUBLIC_MAP_TILE_SIZE=512
 *   NEXT_PUBLIC_MAP_ATTRIBUTION=© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
 *
 * The token ships to the browser, so it must be URL-restricted in the
 * provider's dashboard — a public token with no referrer allow-list is a
 * bill waiting to happen.
 */
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_SIZE = Number(process.env.NEXT_PUBLIC_MAP_TILE_SIZE) || 256;

/**
 * Small click-to-drop-a-pin map used in the share-an-idea wizard.
 * Optional by design: skipping it just means the project appears in the
 * list but not on the map.
 */
export function MapPicker({
  value,
  onChange,
  center = null,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number } | null) => void;
  /**
   * Where to open when no pin is set — your saved spot or your
   * neighborhood's centre. Without it the map opens on the whole planet,
   * which is a map of nowhere: you can't drop a useful pin from orbit.
   */
  center?: { lat: number; lng: number } | null;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [locating, setLocating] = useState(false);

  function setMarker(lat: number, lng: number) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const icon = L.divIcon({
      className: "",
      html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">📍</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 24],
    });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
  }

  useEffect(() => {
    if (!holderRef.current) return;
    let disposed = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !holderRef.current || mapRef.current) return;
      leafletRef.current = L;

      const start = value ?? center;
      const map = L.map(holderRef.current, { scrollWheelZoom: false }).setView(
        start ? [start.lat, start.lng] : [20, 0],
        value ? 16 : start ? 14 : 2,
      );
      // Tiles are provider-swappable: OSM's public tiles are free but
      // policy-limited (fine for a pilot, not for a real user base) and
      // their general-purpose style draws every hospital and car park,
      // which competes with our pins. Point NEXT_PUBLIC_MAP_TILE_URL at
      // Mapbox/Stadia/MapTiler — no code change (see docs/SCALING.md).
      //
      // TILE_SIZE matters: Mapbox and most modern styles serve 512px tiles,
      // and Leaflet assumes 256px. Left at the default, every label and
      // road renders at half scale — a map that looks "zoomed out wrong".
      // Providers that serve 512 need zoomOffset -1 to compensate.
      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        tileSize: TILE_SIZE,
        zoomOffset: TILE_SIZE === 512 ? -1 : 0,
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        setMarker(e.latlng.lat, e.latlng.lng);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      if (value) setMarker(value.lat, value.lng);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map initializes once; `value` afterwards only moves the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.setView([lat, lng], 16);
        setMarker(lat, lng);
        onChangeRef.current({ lat, lng });
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={holderRef}
        className="z-0 h-52 w-full overflow-hidden rounded-xl border border-slate-400 dark:border-slate-400"
        aria-label="Pick a location on the map"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-slate-400 dark:hover:bg-white/10"
        >
          {locating ? "Locating…" : "📍 Use my location"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => {
              markerRef.current?.remove();
              markerRef.current = null;
              onChangeRef.current(null);
            }}
            className="text-xs text-black/50 hover:underline dark:text-white/50"
          >
            Remove pin
          </button>
        ) : (
          <span className="text-xs text-black/40 dark:text-white/40">
            Tap to drop a pin — optional.
          </span>
        )}
      </div>
    </div>
  );
}
