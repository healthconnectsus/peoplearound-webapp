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

/**
 * How long a browser may keep the pictures that ship in `public/` without
 * asking again.
 *
 * Next cannot know whether a file in `public/` will change, so it serves all
 * of them with `max-age=0, must-revalidate`: the browser keeps the bytes but
 * must check with the server before every use. That check is a full round
 * trip that returns nothing (a 304), paid again on every page load, for every
 * picture on the page. /people lists up to a hundred neighbors, so scrolling
 * it was up to a hundred of those, each holding a face back until its answer
 * came, and each one counted as a billed request at the edge.
 *
 * The folders below are content, not branding, and they do not change in
 * place: git history has never once modified a file in avatars/, faces/ or
 * photos/ — new pictures arrive under new names. So a week without asking,
 * then a month in which the browser shows what it has and checks in the
 * background.
 *
 * Deliberately NOT here: the logo and the app icons. logo.svg has been
 * rewritten in place 25 times and the icons 6, so they keep the default and
 * every visitor sees a new logo the moment it ships. Built JavaScript and CSS
 * need nothing either — Next already serves those as immutable, with the
 * content hash in the file name.
 */
const longLivedImages = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=2592000",
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  experimental: {
    /**
     * Remember a page you just left, in the tab's own memory.
     *
     * Next keeps visited pages in a client-side cache, but for a *dynamic*
     * route with a `loading` boundary — which is every signed-in page here —
     * the lifetime defaults to zero, so it is never reused. Measured on
     * production, clicking a rail item you visited ten seconds ago costs the
     * same as arriving fresh: 180–430ms, a full server render and its
     * database reads, for a page the browser already had.
     *
     * Thirty seconds, deliberately short. It is long enough to cover the way
     * people actually move around a feed — out to an event and back, into a
     * project and back — and short enough that nothing on screen can be
     * meaningfully wrong. It also costs nothing to be wrong about, because
     * the cache is invalidated by the things that would make it stale:
     *
     *   • every mutation. The server actions call `revalidatePath`, which
     *     clears the matching client entries — claiming an ask, starring a
     *     project, sending a message.
     *   • signing out, which calls `revalidatePath("/", "layout")` and so
     *     empties the whole cache. Nothing personal survives into the next
     *     person to use the browser.
     *   • `LiveRefresh`, whose `router.refresh()` is a cache bust, so the
     *     pages that subscribe to realtime stay live regardless.
     *
     * This lives in the tab's memory only: nothing is written to disk, no
     * cookie grows, and it is gone when the tab closes.
     *
     * Marked experimental by Next (it has existed since 14.2). Setting it to
     * 0 restores today's behaviour with no other change.
     */
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/avatars/:path*", headers: longLivedImages },
      { source: "/faces/:path*", headers: longLivedImages },
      { source: "/photos/:path*", headers: longLivedImages },
    ];
  },
};

export default nextConfig;
