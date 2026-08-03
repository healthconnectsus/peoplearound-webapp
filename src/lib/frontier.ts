import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Frontier locations — the shared server-side logic for turning coordinates
 * in uncovered territory into a directory entry. Used by:
 *   • /api/register-location (preview for logged-out visitors)
 *   • the home page's first-visit claim (actual registration — auth'd only)
 * A new place is only ever REGISTERED for a signed-up user; anonymous
 * visitors get a read-only preview. The ops alert fires once per new place.
 */

const ALERT_TO = process.env.ALERT_EMAIL ?? "peoplearound.alexandre@gmail.com";
const ALERT_FROM =
  process.env.ALERT_FROM ?? "Peoplearound <onboarding@resend.dev>";

export type GeoName = { name: string; city: string | null; region: string };

type NominatimAddress = {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

export function ipHash(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "peoplearound-frontier";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoName> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=14&accept-language=en`;
  const res = await fetch(url, {
    // Nominatim's usage policy requires an identifying User-Agent.
    headers: { "User-Agent": `peoplearound-webapp (${ALERT_TO})` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = (await res.json()) as { address?: NominatimAddress };
  const a = data.address ?? {};
  const name =
    a.neighbourhood ??
    a.suburb ??
    a.quarter ??
    a.village ??
    a.town ??
    a.city ??
    a.municipality ??
    "New neighborhood";
  const city = a.city ?? a.town ?? a.municipality ?? a.county ?? null;
  const region = [a.state, a.country].filter(Boolean).join(", ");
  return { name, city, region };
}

/** Geocode with a coordinate-name fallback so the pipeline never stalls. */
export async function geocodeOrFallback(lat: number, lng: number): Promise<GeoName> {
  try {
    return await reverseGeocode(lat, lng);
  } catch (e) {
    console.warn(
      "[frontier] reverse geocode failed:",
      e instanceof Error ? (e.cause ?? e.message) : e,
    );
    return {
      name: `New area (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      city: null,
      region: "",
    };
  }
}

async function sendOpsAlert(details: {
  geo: GeoName;
  lat: number;
  lng: number;
  firstNeighbor: string | null;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[frontier] RESEND_API_KEY not set — skipping ops alert");
    return;
  }
  const { geo, lat, lng } = details;
  const mapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_TO],
      subject: `🌍 New Peoplearound location: ${geo.name}${geo.city ? `, ${geo.city}` : ""}`,
      html: [
        `<h2>A neighbor signed up somewhere new</h2>`,
        `<p>A new account was created from a location that wasn't in the directory, so it was added automatically:</p>`,
        `<ul>`,
        `<li><strong>Neighborhood:</strong> ${geo.name}</li>`,
        geo.city ? `<li><strong>City:</strong> ${geo.city}</li>` : "",
        geo.region ? `<li><strong>Region:</strong> ${geo.region}</li>` : "",
        `<li><strong>Coordinates:</strong> <a href="${mapLink}">${lat.toFixed(4)}, ${lng.toFixed(4)}</a></li>`,
        details.firstNeighbor
          ? `<li><strong>First neighbor:</strong> ${details.firstNeighbor}</li>`
          : "",
        `</ul>`,
        `<p>It's live in the directory now — rename it or draw a boundary in Supabase if needed.</p>`,
      ].join(""),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.warn("[frontier] alert email failed:", await res.text());
  }
}

export type FrontierResult =
  | { ok: true; id: string; name: string; created: boolean }
  | { ok: false; reason: "rate_limited" | "not_configured" | "failed" };

/**
 * Register an uncovered location (geocode → dedup + caps in the DB → ops
 * alert). Call ONLY on behalf of a signed-up user — that requirement is the
 * strongest anti-spam wall we have.
 */
export async function registerFrontierLocation(
  lat: number,
  lng: number,
  hashedIp: string,
  firstNeighbor: string | null,
): Promise<FrontierResult> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[frontier] SUPABASE_SERVICE_ROLE_KEY not set");
    return { ok: false, reason: "not_configured" };
  }

  const geo = await geocodeOrFallback(lat, lng);

  const { data: regRows, error } = await admin.rpc("register_frontier_location", {
    p_lat: lat,
    p_lng: lng,
    p_name: geo.name,
    p_city: geo.city,
    p_ip_hash: hashedIp,
  });
  const reg = (
    regRows as
      | { id: string | null; name: string | null; created: boolean; rate_limited: boolean }[]
      | null
  )?.[0];
  if (error || !reg) return { ok: false, reason: "failed" };
  if (reg.rate_limited || !reg.id) return { ok: false, reason: "rate_limited" };

  if (reg.created) {
    await sendOpsAlert({ geo, lat, lng, firstNeighbor });
  }
  return { ok: true, id: reg.id, name: reg.name!, created: reg.created };
}
