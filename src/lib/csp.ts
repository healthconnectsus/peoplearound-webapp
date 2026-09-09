/**
 * Content Security Policy.
 *
 * The site had every cheap header except this one. CSP is the expensive one:
 * it is the difference between "an injected script can read every neighbor's
 * private messages and post them to an attacker's server" and "an injected
 * script cannot run, and if it somehow does, it cannot phone home".
 *
 * Two decisions worth recording, because both are easy to get wrong.
 *
 * 1. NONCES, NOT `unsafe-inline`. A CSP whose script-src contains
 *    'unsafe-inline' stops almost nothing — the whole point of XSS is
 *    injecting inline script. Next 16 applies a per-request nonce to every
 *    framework and page script automatically, as long as the nonce reaches it
 *    on the request's CSP header (see the proxy). Paired with 'strict-dynamic'
 *    so the scripts those trusted scripts load are trusted in turn, without
 *    maintaining a host allowlist that goes stale.
 *
 * 2. STYLES KEEP 'unsafe-inline', DELIBERATELY. A nonce cannot authorise a
 *    style *attribute*, and this app sets `style={{...}}` in a dozen places
 *    (the category bar widths on the city page, the hero background, Leaflet's
 *    own positioning). Adding a nonce to style-src would make browsers ignore
 *    'unsafe-inline' and silently break every one of them. Injected CSS is a
 *    far weaker vector than injected script, so this is the right trade — but
 *    it is a trade, not an oversight.
 *
 * Rolled out REPORT-ONLY first. A CSP that is wrong in a way you did not
 * predict does not degrade, it blanks the page; report-only tells the truth
 * about what would break while breaking nothing. Flip with CSP_ENFORCE=1 once
 * the reports are quiet.
 */

/** Where the browser posts violations. Must stay in step with the route. */
export const REPORT_PATH = "/api/csp-report";

/** Every third-party origin the BROWSER is allowed to reach, and why. */
function origins() {
  // Supabase: REST, auth, storage (photos and avatars) over https; realtime
  // over wss. Derived from the configured project so this cannot drift.
  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/+$/,
    "",
  );
  const supabaseWs = supabase.replace(/^https:/, "wss:");

  return {
    supabase,
    supabaseWs,
    // Turnstile (bot protection on the login form) loads a script and renders
    // its challenge in an iframe, and posts the result back to itself.
    turnstile: "https://challenges.cloudflare.com",
    // Map tiles. Mapbox when a token is configured, OpenStreetMap otherwise
    // (src/lib/basemap.ts decides); both are allowed so a change of provider
    // is not also a blank map.
    tiles: ["https://api.mapbox.com", "https://tile.openstreetmap.org"],
    // Stock cover photos. The picker proxies the SEARCH through our own API
    // route, but the chosen image itself is served from Unsplash's CDN and its
    // URL is stored on the project.
    photos: "https://images.unsplash.com",
  };
}

/**
 * Build the policy for one request.
 *
 * @param nonce  Per-request nonce. Must be unpredictable and never reused.
 * @param isDev  Development needs 'unsafe-eval': React evaluates code to
 *               rebuild server stack traces in the browser. Production does
 *               not, and must not have it.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const o = origins();

  const directives: string[] = [
    "default-src 'self'",

    // 'self' and the Turnstile host are fallbacks for browsers that do not
    // support 'strict-dynamic' (which, where supported, makes them ignored).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${o.turnstile}${
      isDev ? " 'unsafe-eval'" : ""
    }`,

    // See the header comment: no nonce here, on purpose.
    "style-src 'self' 'unsafe-inline'",

    // blob: and data: are ours — the photo picker previews a chosen file as a
    // blob URL before it is uploaded, and the drawn avatars are data URIs.
    `img-src 'self' data: blob: ${o.supabase} ${o.tiles.join(" ")} ${o.photos}`,

    // next/font self-hosts Roboto, so no font CDN is needed at all.
    "font-src 'self'",

    `connect-src 'self' ${o.supabase} ${o.supabaseWs} ${o.turnstile}`,

    // The Turnstile widget is an iframe. Nothing else may be framed.
    `frame-src ${o.turnstile}`,

    // The service worker (public/sw.js) and the PWA manifest are same-origin.
    "worker-src 'self'",
    "manifest-src 'self'",

    "media-src 'self'",

    // No Flash, no <object>. Nothing here uses them.
    "object-src 'none'",

    // Stops an injected <base> tag from re-pointing every relative script URL
    // at an attacker's host — the classic way around a script-src allowlist.
    "base-uri 'self'",

    // Server actions post to this origin. Nothing legitimately posts off-site,
    // so this blocks a form whose action was rewritten to exfiltrate what the
    // user typed.
    "form-action 'self'",

    // The same guarantee as X-Frame-Options: DENY, in the modern header.
    // Revisit if the embeddable "ideas near you" widget is ever built.
    "frame-ancestors 'none'",

    // Where violations are sent. Both spellings on purpose: report-to is the
    // current standard and the only one Chrome still honours, report-uri the
    // deprecated one Firefox and Safari still rely on. Without both, half the
    // real browsers report nothing and the rollout looks cleaner than it is.
    "report-to csp-endpoint",
    `report-uri ${REPORT_PATH}`,
  ];

  // Locally the dev server is http; asking the browser to upgrade every
  // request to https would break it.
  if (!isDev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

/**
 * Report-only until proven quiet. `CSP_ENFORCE=1` in the environment turns it
 * into a real policy — one variable, no code change, so the flip is cheap to
 * make and cheap to undo.
 */
export function cspHeaderName(): string {
  return process.env.CSP_ENFORCE === "1"
    ? "content-security-policy"
    : "content-security-policy-report-only";
}
