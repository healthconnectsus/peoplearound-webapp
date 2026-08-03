import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/register-location  { lat, lng }
 *
 * Called by the logged-out landing page when a visitor's location matches no
 * neighborhood in the directory. Reverse-geocodes the coordinates (OSM
 * Nominatim), registers the place as a new neighborhood, and emails ops.
 *
 * Abuse posture (this endpoint is anonymous and has side effects):
 *   1. Same-origin check — browsers send Origin on cross-site POSTs.
 *   2. In-memory per-IP + global throttle — cheap first wall per instance.
 *   3. Hard caps in the database (3 new places per IP hash per day, 25
 *      globally) — enforced inside register_frontier_location, which only
 *      the service role may execute, so bots cannot call it directly.
 * Coordinates are used for the lookup and the neighborhood's center; the IP
 * is stored only as a salted hash, never raw.
 */

const ALERT_TO = process.env.ALERT_EMAIL ?? "peoplearound.alexandre@gmail.com";
const ALERT_FROM =
  process.env.ALERT_FROM ?? "Peoplearound <onboarding@resend.dev>";

// --- wall 2: in-memory throttle (per serverless instance; DB caps are the
// real limit — this just sheds hot loops cheaply). ---
const WINDOW_MS = 60_000;
const PER_IP_PER_MIN = 5;
const GLOBAL_PER_MIN = 30;
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  for (const [k, arr] of hits) {
    const fresh = arr.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) hits.delete(k);
    else hits.set(k, fresh);
  }
  const mine = hits.get(ip) ?? [];
  const all = [...hits.values()].reduce((n, a) => n + a.length, 0);
  if (mine.length >= PER_IP_PER_MIN || all >= GLOBAL_PER_MIN) return true;
  mine.push(now);
  hits.set(ip, mine);
  return false;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

function ipHash(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "peoplearound-frontier";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser callers hit the other walls
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

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

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ name: string; city: string | null; region: string }> {
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

async function sendOpsAlert(details: {
  name: string;
  city: string | null;
  region: string;
  lat: number;
  lng: number;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[register-location] RESEND_API_KEY not set — skipping ops alert email for",
      details.name,
    );
    return;
  }
  const mapLink = `https://www.openstreetmap.org/?mlat=${details.lat}&mlon=${details.lng}#map=14/${details.lat}/${details.lng}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_TO],
      subject: `🌍 New Peoplearound location: ${details.name}${details.city ? `, ${details.city}` : ""}`,
      html: [
        `<h2>Someone just showed up somewhere new</h2>`,
        `<p>A visitor opened Peoplearound from a location that wasn't in the directory, so it was added automatically:</p>`,
        `<ul>`,
        `<li><strong>Neighborhood:</strong> ${details.name}</li>`,
        details.city ? `<li><strong>City:</strong> ${details.city}</li>` : "",
        details.region ? `<li><strong>Region:</strong> ${details.region}</li>` : "",
        `<li><strong>Coordinates:</strong> <a href="${mapLink}">${details.lat.toFixed(4)}, ${details.lng.toFixed(4)}</a></li>`,
        `</ul>`,
        `<p>It's live in the directory now — rename it or draw a boundary in Supabase if needed.</p>`,
      ].join(""),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.warn("[register-location] alert email failed:", await res.text());
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ip = clientIp(request);
  if (throttled(ip)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  let lat: number, lng: number;
  try {
    const body = (await request.json()) as { lat?: unknown; lng?: unknown };
    lat = Number(body.lat);
    lng = Number(body.lng);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json({ error: "Bad coordinates" }, { status: 400 });
  }

  const supabase = await createClient();

  // Existing coverage? Cheap, unlimited, and the common case.
  const { data: match } = await supabase.rpc("locate_teaser", { lat, lng });
  const existing = (match as { id: string; name: string }[] | null)?.[0];
  if (existing) {
    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      created: false,
    });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.warn("[register-location] SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  // If reverse geocoding is unavailable, register anyway under a
  // coordinate name — the ops alert links the map, so it can be renamed.
  let geo: Awaited<ReturnType<typeof reverseGeocode>>;
  try {
    geo = await reverseGeocode(lat, lng);
  } catch (e) {
    console.warn(
      "[register-location] reverse geocode failed:",
      e instanceof Error ? (e.cause ?? e.message) : e,
    );
    geo = {
      name: `New area (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      city: null,
      region: "",
    };
  }

  const { data: regRows, error: regError } = await admin.rpc(
    "register_frontier_location",
    {
      p_lat: lat,
      p_lng: lng,
      p_name: geo.name,
      p_city: geo.city,
      p_ip_hash: ipHash(ip),
    },
  );
  const reg = (
    regRows as
      | { id: string | null; name: string | null; created: boolean; rate_limited: boolean }[]
      | null
  )?.[0];
  if (regError || !reg) {
    return NextResponse.json({ error: "Could not register" }, { status: 500 });
  }
  if (reg.rate_limited || !reg.id) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  if (reg.created) {
    // Fire the ops alert exactly once per brand-new place.
    await sendOpsAlert({ name: reg.name!, city: geo.city, region: geo.region, lat, lng });
  }

  return NextResponse.json({ id: reg.id, name: reg.name, created: reg.created });
}
