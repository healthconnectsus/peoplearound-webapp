import { NextResponse, type NextRequest } from "next/server";
import { publicEvent, qrSvg, shareUrl } from "@/lib/events";

/**
 * GET /e/<code>/qr — the event's QR code, as SVG.
 *
 * Vector, so it prints crisply at any size: on an A4 poster, on a sticker,
 * or dropped into whatever the print shop uses. `?download=1` sends it as a
 * file instead of showing it.
 *
 * Only shared events have one. Asking for the QR of an event nobody
 * published gets a 404, the same as the page itself.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const event = await publicEvent(code);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const name = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return new NextResponse(qrSvg(shareUrl(code)), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // The code never changes once published, so this is safe to keep.
      "cache-control": "public, max-age=86400",
      ...(download
        ? {
            "content-disposition": `attachment; filename="${name || "event"}-qr.svg"`,
          }
        : {}),
    },
  });
}
