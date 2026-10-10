import "server-only";
import { createAnonClient } from "@/lib/supabase/anon";
import { isHostedCode } from "@/app/qr/_hosted/slugs";

/**
 * Printed QR codes (migrations 0073 and 0081), resolved in the proxy.
 *
 * The paper cannot change; the row in `qr_codes` can. Every scan of
 * /qr/<code> is looked up and sent wherever the row points today — aimed
 * from the admin console, no reprint, no deploy — unless the code is a
 * destination in itself: a page built into the site (src/app/qr/_hosted).
 *
 * Why the proxy and not the page: a redirect decided inside a page becomes
 * a <meta> refresh in a 200 once the root loading boundary has started
 * streaming, and a printed code deserves a real 307 — a status every
 * browser, link unfurler and command line understands, and one that nothing
 * caches. A permanent redirect would be the natural-looking choice and the
 * wrong one: the day the destination changes, the people who already
 * scanned would keep landing at the old one.
 */

/** The code in a `/qr/<code>` path — one segment, nothing after it. */
export function printedCode(path: string): string | null {
  const m = /^\/qr\/([^/]+)\/?$/.exec(path);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * What the row knows. `null` for a code nobody made; `undefined` when the
 * database gave no answer in time.
 */
type Known = { url: string | null; enabled: boolean };

async function lookUp(
  slug: string,
  count: boolean,
): Promise<Known | null | undefined> {
  try {
    // No session is read: this is a stranger with a phone camera.
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .rpc("qr_scan", { p_slug: slug, p_count: count })
      // A stalled database should not hold a stranger for long. For a hosted
      // page the cost is one uncounted scan; for a redirect this is the one
      // case where waiting beats guessing, so the limit is generous.
      .abortSignal(AbortSignal.timeout(4000));
    if (error) return undefined;
    if (data === null || typeof data !== "object") return null;

    const row = data as { url?: unknown; enabled?: unknown };
    return {
      // http(s) only, checked here and again by a constraint on the table,
      // so a printed code can never become a javascript: or data: payload.
      url:
        typeof row.url === "string" && /^https?:\/\//i.test(row.url)
          ? row.url
          : null,
      enabled: row.enabled === true,
    };
  } catch {
    return undefined;
  }
}

/**
 * Where a scan of `slug` goes: a URL to redirect to, or `null` when the
 * code's own page should render.
 *
 *   • a destination set in the console wins;
 *   • a code switched off goes to the front door, page or no page;
 *   • a code with a page of its own shows it — also when the database is
 *     having a bad minute (one scan uncounted) or has no row for it yet;
 *   • anything else goes to the front door. Someone holding a piece of
 *     paper did nothing wrong, and a login page is not an answer.
 */
export async function whereToSend(
  slug: string,
  count: boolean,
  home: string,
): Promise<string | null> {
  const known = await lookUp(slug, count);
  if (known?.enabled && known.url) return known.url;
  if (known && !known.enabled) return home;
  if (isHostedCode(slug)) return null;
  return home;
}
