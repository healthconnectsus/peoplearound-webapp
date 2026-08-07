import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calendarStamp } from "@/lib/projects";

/**
 * GET /api/event-ics?id=<eventId> — downloads the event as an .ics file.
 * Auth-gated: RLS decides whether this user can see the event at all.
 * Times are exported "floating" (no timezone) to match how founders enter
 * them — the wall-clock time is the truth for a neighborhood event.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Bad event id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id,title,starts_at,place,project_id,project:projects(title)")
    .eq("id", id)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = (event as { project?: { title?: string } | null }).project;
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peoplearound//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@peoplearound.com`,
    `DTSTAMP:${calendarStamp(new Date().toISOString())}`,
    `DTSTART:${calendarStamp(event.starts_at)}`,
    `DTEND:${calendarStamp(event.starts_at, 2)}`,
    `SUMMARY:${esc(event.title)}`,
    project?.title
      ? `DESCRIPTION:${esc(`Part of “${project.title}” on Peoplearound — https://peoplearound.com/projects/${event.project_id}`)}`
      : "",
    event.place ? `LOCATION:${esc(event.place)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.ics"`,
    },
  });
}
