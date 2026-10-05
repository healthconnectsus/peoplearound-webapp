import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /e/<code>/join — "I'm in", pressed on the public event page.
 *
 * POST, not a link, for one reason: a link is prefetched. Next fetches links
 * the moment they come into view, so an "I'm in" anchor would sign people up
 * for simply having read the flyer. A form post happens when a thumb lands
 * on it and never before.
 *
 * Signed in: the RSVP is recorded and they land on the event inside the app,
 * where they can see who else is coming. Signed out: they go to sign-up, and
 * `next` brings them back to that same event page afterwards — the whole
 * point of a poster is that it turns a stranger into a neighbor, and losing
 * them at the sign-up form is where that fails.
 */

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser callers get nothing from this anyway
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!/^[A-Z0-9]{4,16}$/i.test(code)) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The event is read under the caller's own row-level security. For a
  // signed-out visitor that reads nothing, which is why the id comes from
  // the public document instead.
  if (!user) {
    const { data } = await supabase.rpc("public_event", { p_code: code });
    const id = (data as { id?: string } | null)?.id;
    const next = id ? `/events/${id}` : `/e/${code}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, request.url),
      { status: 303 },
    );
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("share_code", code)
    .maybeSingle();
  if (!event) {
    return NextResponse.redirect(new URL("/events", request.url), {
      status: 303,
    });
  }

  // Already coming? Then this press changes nothing — it must not toggle
  // them back out, which is what the in-app button does deliberately.
  await supabase
    .from("rsvps")
    .upsert(
      { event_id: event.id, user_id: user.id },
      { onConflict: "event_id,user_id", ignoreDuplicates: true },
    );

  return NextResponse.redirect(
    new URL(`/events/${event.id}?joined=1`, request.url),
    { status: 303 },
  );
}
