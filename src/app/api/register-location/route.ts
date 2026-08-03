import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  geocodeOrFallback,
  ipHash,
  registerFrontierLocation,
} from "@/lib/frontier";

/**
 * POST /api/register-location  { lat, lng, preview? }
 *
 * preview: true  — logged-out landing page asking "where am I?" for an
 *   uncovered spot. Read-only: geocodes a display name, writes NOTHING,
 *   sends NOTHING. Signing up is what turns a preview into a real place.
 * preview absent — registers the location. Requires a signed-in user (the
 *   strongest anti-bot wall: a real account behind every new place), plus
 *   the DB-enforced caps (3/IP/day, 25/day global).
 *
 * Plus the cheap walls for both modes: same-origin check and an in-memory
 * per-IP throttle. IPs are only ever handled as salted hashes downstream.
 */

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

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ip = clientIp(request);
  if (throttled(ip)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  let lat: number, lng: number, preview: boolean;
  try {
    const body = (await request.json()) as {
      lat?: unknown;
      lng?: unknown;
      preview?: unknown;
    };
    lat = Number(body.lat);
    lng = Number(body.lng);
    preview = body.preview === true;
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

  // Existing coverage? Cheap, and identical for both modes.
  const { data: match } = await supabase.rpc("locate_teaser", { lat, lng });
  const existing = (match as { id: string; name: string }[] | null)?.[0];
  if (existing) {
    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      created: false,
    });
  }

  if (preview) {
    // Name only — nothing is written until this visitor becomes a neighbor.
    const geo = await geocodeOrFallback(lat, lng);
    return NextResponse.json({ name: geo.name, preview: true });
  }

  // Actually adding a place requires a signed-up human.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign up first" }, { status: 401 });
  }

  const result = await registerFrontierLocation(
    lat,
    lng,
    ipHash(ip),
    user.email ?? null,
  );
  if (!result.ok) {
    const status = result.reason === "rate_limited" ? 429 : 503;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({
    id: result.id,
    name: result.name,
    created: result.created,
  });
}
