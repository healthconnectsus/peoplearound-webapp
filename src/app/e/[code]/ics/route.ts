import { NextResponse } from "next/server";
import { publicEvent, shareUrl } from "@/lib/events";
import { calendarStamp } from "@/lib/projects";

/**
 * GET /e/<code>/ics — the shared event as a calendar file, for anyone.
 *
 * The app's own /api/event-ics asks for a session, which is right for a
 * private event and wrong for a poster: someone who scanned a flyer should
 * be able to put it in their calendar before deciding whether to join
 * anything.
 *
 * Times are exported floating (no timezone), matching how they were typed —
 * for a neighborhood event the wall clock is the truth.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const event = await publicEvent(code);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const esc = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const where = [event.place, event.community?.name, event.community?.city]
    .filter(Boolean)
    .join(", ");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peoplearound//EN",
    "BEGIN:VEVENT",
    `UID:${code}@peoplearound.com`,
    `DTSTAMP:${calendarStamp(new Date().toISOString())}`,
    `DTSTART:${calendarStamp(event.starts_at)}`,
    `DTEND:${calendarStamp(event.ends_at ?? event.starts_at, event.ends_at ? 0 : 2)}`,
    `SUMMARY:${esc(event.title)}`,
    where ? `LOCATION:${esc(where)}` : "",
    `DESCRIPTION:${esc(
      `${event.description ? `${event.description}\n\n` : ""}Part of “${event.project.title}” on Peoplearound — ${shareUrl(code)}`,
    )}`,
    `URL:${shareUrl(code)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${code}.ics"`,
      "cache-control": "public, max-age=300",
    },
  });
}
