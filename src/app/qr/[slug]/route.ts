import { NextResponse, type NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * GET /qr/<code> — a printed QR code, resolved on every scan.
 *
 * The paper cannot change; this can. The code is looked up in `qr_codes`
 * (migration 0073) and the visitor is sent wherever that row points today —
 * so a code already printed and handed out can be aimed somewhere else from
 * the admin console, with no reprint and no deploy.
 *
 * Three rules this route lives by:
 *
 *   • Never cached. A permanent redirect (308) is the natural-looking choice
 *     and the wrong one: browsers and CDNs keep those, some of them forever,
 *     so the day the destination changes, the people who already scanned
 *     would keep landing at the old one. Temporary redirect, `no-store`.
 *   • Only ever http(s), checked here and again by a constraint on the
 *     table, so a printed code can never be turned into a `javascript:` or
 *     `data:` payload by a bad write.
 *   • A code with no destination yet — or one switched off, or one that was
 *     never created — sends the visitor to the front door rather than to an
 *     error. Someone holding a piece of paper did nothing wrong.
 *
 * No session is read: this is a stranger with a phone camera, and the
 * anonymous client keeps the request off the cookie path entirely.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const home = new URL("/", request.nextUrl.origin).toString();

  let target: string | null = null;
  try {
    const supabase = createAnonClient();
    // Counts the scan and returns the destination, in one call.
    const { data } = await supabase.rpc("qr_target", { p_slug: slug });
    if (typeof data === "string" && /^https?:\/\//i.test(data)) target = data;
  } catch {
    // A database that is having a bad minute should not strand a scan.
  }

  return NextResponse.redirect(target ?? home, {
    status: 307,
    headers: { "cache-control": "no-store" },
  });
}
