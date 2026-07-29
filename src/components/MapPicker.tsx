"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Small click-to-drop-a-pin map used in the share-an-idea wizard.
 * Optional by design: skipping it just means the project appears in the
 * list but not on the map.
 */
export function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number } | null) => void;
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

      const map = L.map(holderRef.current, { scrollWheelZoom: false }).setView(
        value ? [value.lat, value.lng] : [20, 0],
        value ? 15 : 2,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
        className="z-0 h-52 w-full overflow-hidden rounded-xl border border-black/15 dark:border-white/20"
        aria-label="Pick a location on the map"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
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
            Tap the map to drop a pin — or skip this entirely.
          </span>
        )}
      </div>
    </div>
  );
}
