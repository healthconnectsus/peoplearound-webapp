import type { JWK, JwtPayload, SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any -- ssr + js clients */
type Client = SupabaseClient<any, any, any>;

/**
 * Who is asking, established without leaving the building.
 *
 * `auth.getUser()` phones the auth server on every call — a round trip of
 * 100–150ms — and the site was making that call twice per page: once in the
 * proxy to guard the route, once in the render to know who to show. Before a
 * single row had been read, a quarter of a second was gone.
 *
 * The session's access token is a JWT this project signs with an asymmetric
 * key (ES256). Anyone holding the public half can check the signature, and
 * the public half is published at a well-known URL that changes only when the
 * key is rotated. So: fetch that once per server instance, keep it for ten
 * minutes, and verify tokens locally in about a millisecond. This is what
 * `getClaims()` does when handed the keys — and what Supabase now recommends
 * over `getUser()` for exactly this reason.
 *
 * What is given up: a session revoked elsewhere (sign out on another device,
 * a banned account) stays valid here until its token expires, at most an
 * hour. The proxy still refreshes expired sessions on the way through, so
 * nothing about staying signed in changes.
 *
 * Kept free of `next/headers` so the proxy — which runs before any request
 * context exists — can share it with the render.
 */

const JWKS_TTL_MS = 10 * 60 * 1000;

let cached: { keys: JWK[]; at: number } | null = null;
let inflight: Promise<JWK[] | null> | null = null;

async function signingKeys(force = false): Promise<JWK[] | null> {
  if (!force && cached && Date.now() - cached.at < JWKS_TTL_MS) {
    return cached.keys;
  }
  // One fetch at a time, however many requests arrive while it is in the air.
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
          { cache: "no-store" },
        );
        if (!res.ok) return cached?.keys ?? null;
        const body = (await res.json()) as { keys?: JWK[] };
        if (!body.keys?.length) return cached?.keys ?? null;
        cached = { keys: body.keys, at: Date.now() };
        return body.keys;
      } catch {
        // Offline for a moment: a stale key set still verifies today's
        // tokens, and with no keys at all getClaims falls back to the
        // auth server, which is merely the old slow path.
        return cached?.keys ?? null;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/**
 * The verified claims of the current session, or null when there is none.
 *
 * `sub` is the user id and `email` the address; that is all the render needs
 * to know about a person before it reads their profile row.
 */
export async function verifiedClaims(
  supabase: Client,
): Promise<JwtPayload | null> {
  const keys = await signingKeys();
  const { data, error } = await supabase.auth.getClaims(
    undefined,
    keys ? { keys } : undefined,
  );
  if (error || !data) return null;

  // A key id we do not hold means the key was rotated. auth-js already took
  // the slow path for this request; refresh so the next one is fast again.
  const kid = data.header.kid;
  if (kid && keys && !keys.some((k) => k.kid === kid)) void signingKeys(true);

  return data.claims;
}
