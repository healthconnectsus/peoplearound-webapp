import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/** Resolve the short commit SHA at build time (Vercel env or local git). */
function commitSha(): string {
  // VERCEL_GIT_COMMIT_SHA on Git-integration deploys; SHIP_COMMIT_SHA is
  // passed by scripts/ship.mjs for CLI deploys (where .git isn't uploaded).
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.SHIP_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const appVersion = process.env.npm_package_version ?? "0.1.0";

/**
 * Security headers. The site shipped with only HSTS (from Vercel), which
 * left three cheap protections on the table.
 *
 * Referrer-Policy is the one that matters most here. Private conversations
 * are addressed by id in the URL (`/chats?c=<uuid>`), and every page loads
 * third-party resources — map tiles, photos. Without a policy the browser
 * sends the FULL url as the Referer to those third parties, handing them
 * conversation ids. `strict-origin-when-cross-origin` sends only the origin
 * off-site, which is also exactly what Mapbox's URL restrictions need, so
 * this tightens privacy without breaking the map.
 */
const securityHeaders = [
  // The app is not meant to be framed; this is the clickjacking guard.
  // Revisit if the embeddable "ideas near you" widget is ever built.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // "Locate me" needs geolocation; nothing here needs a camera or a mic.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
