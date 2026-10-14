import { NextResponse, type NextRequest } from "next/server";
import { flyerQr, projectShareUrl, publicProject } from "@/lib/flyer";

/**
 * GET /p/<code>/qr — the project's QR code, as SVG.
 *
 * Vector, so it prints crisply at any size: on the flyer, on a sticker, or
 * dropped into whatever the print shop uses. `?download=1` sends it as a
 * file instead of showing it. Drawn in the flyer's own look when there is
 * one.
 *
 * Only published projects have one. Asking for the code of a project nobody
 * published gets a 404, the same as the page itself.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const project = await publicProject(code);
  if (!project) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const name = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return new NextResponse(flyerQr(projectShareUrl(code), project.flyer?.style ?? "teal"), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // The code never changes once published, so this is safe to keep.
      "cache-control": "public, max-age=86400",
      ...(download
        ? { "content-disposition": `attachment; filename="${name || "project"}-qr.svg"` }
        : {}),
    },
  });
}
