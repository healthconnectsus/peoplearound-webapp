"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  title: string;
  emoji: string;
  href: string;
  lat: number;
  lng: number;
  /** Small line under the title in the popup, e.g. "🚀 Building · 📅 Sat" */
  subtitle: string;
  /** Highlight ring for projects with an event this week. */
  hot?: boolean;
};

/** How far from home still counts as "around you", for framing purposes. */
const NEARBY_KM = 40;

/** Rough great-circle distance in km — precise enough to decide a viewport. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The neighborhood, as a place: an OpenStreetMap view with one emoji pin
 * per located project. Leaflet is imported dynamically so it only ever
 * runs in the browser.
 */
export function NeighborhoodMap({
  pins,
  className = "h-72",
  center = null,
}: {
  pins: MapPin[];
  className?: string;
  /**
   * Your neighborhood. The map frames itself around *here* — a single pin
   * in another city would otherwise drag the viewport out to a continent,
   * and a map of a continent tells you nothing about what's around you.
   * Distant pins still render; they just don't get a vote on the framing.
   */
  center?: { lat: number; lng: number } | null;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (!holderRef.current || pins.length === 0) return;
    let disposed = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !holderRef.current) return;

      map = L.map(holderRef.current, { scrollWheelZoom: false });
      // Tiles are provider-swappable: OSM's public tiles are free but
      // policy-limited (fine for a pilot, throttled for a real user base).
      // Point NEXT_PUBLIC_MAP_TILE_URL at Stadia/MapTiler when we outgrow
      // them — no code change (see docs/SCALING.md).
      L.tileLayer(
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        },
      ).addTo(map);

      const nearby = center
        ? pins.filter((p) => distanceKm(p, center) <= NEARBY_KM)
        : pins;
      if (nearby.length > 0) {
        const bounds = L.latLngBounds(nearby.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds.pad(0.25), { maxZoom: 16 });
      } else if (center) {
        // Nothing near home yet — show home anyway rather than the continent
        // that happens to contain the one distant pin.
        map.setView([center.lat, center.lng], 13);
      } else {
        map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])).pad(0.25), {
          maxZoom: 16,
        });
      }

      for (const pin of pins) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));${
            pin.hot ? "animation:pa-pulse 1.6s ease-in-out infinite;" : ""
          }">${pin.emoji}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 20],
        });
        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map!);
        marker.bindPopup(
          `<strong style="display:block;margin-bottom:2px">${pin.emoji} ${pin.title
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")}</strong><span style="opacity:.7">${pin.subtitle
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")}</span>`,
          { closeButton: false },
        );
        marker.on("mouseover", () => marker.openPopup());
        marker.on("click", () => routerRef.current.push(pin.href));
      }
    })();

    return () => {
      disposed = true;
      map?.remove();
    };
    // Pins come from a server component; re-render on content change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pins), center?.lat, center?.lng]);

  if (pins.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <style>{`@keyframes pa-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.35); } }`}</style>
      <div
        ref={holderRef}
        className="z-0 h-full w-full overflow-hidden rounded-2xl border border-black/10 shadow-sm dark:border-white/10"
        aria-label="Map of projects around you"
      />
      <p className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow dark:bg-zinc-900/90">
        📍 What&apos;s being built around you
      </p>
    </div>
  );
}
