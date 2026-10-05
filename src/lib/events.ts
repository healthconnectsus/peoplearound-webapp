import "server-only";
import QRCode from "qrcode-svg";
import { createAnonClient } from "@/lib/supabase/anon";
import { SITE_URL } from "@/lib/site";

/**
 * A shared event — the public half (migration 0074).
 *
 * `/e/<code>` is the only page of this app a stranger can read, and it exists
 * because a flyer on a lamppost is useless if the link on it asks for a
 * password. What it shows is deliberately thin: what, when, where, whose
 * project, and how many people are coming. No names, no attendee list.
 */

export type PublicEvent = {
  /** Only used to send someone who just signed up to the event in the app. */
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  place: string;
  description: string | null;
  photo_url: string | null;
  /** Set when the organizer called it off (migration 0078). */
  cancelled_at: string | null;
  cancelled_reason: string | null;
  going: number;
  /** What needs doing, as counts — never who took it (migration 0076). */
  jobs: { title: string; detail: string | null; needed: number; taken: number }[];
  project: { title: string; category: string };
  community: { name: string; city: string | null } | null;
};

/** The code's own page. What the QR encodes, and what people type in. */
export function shareUrl(code: string): string {
  return `${SITE_URL}/e/${code}`;
}

/**
 * Reads with the anonymous client, so this page never touches a cookie and
 * can be cached and served to everyone alike.
 */
export async function publicEvent(code: string): Promise<PublicEvent | null> {
  if (!/^[A-Z0-9]{4,16}$/i.test(code)) return null;
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("public_event", { p_code: code });
  if (error || !data) return null;
  return data as PublicEvent;
}

/**
 * The QR code itself, as SVG.
 *
 * Drawn on the server so a poster needs no JavaScript and prints at any size
 * without going fuzzy — a QR is lines, and lines belong in vector.
 *
 * Error correction Q (25%) rather than the usual M: this ends up taped to a
 * lamppost in the rain, and a quarter of the code can be lost before a phone
 * stops reading it. The URL is short enough that the extra redundancy costs
 * no meaningful density.
 */
export function qrSvg(url: string): string {
  return new QRCode({
    content: url,
    padding: 2,
    ecl: "Q",
    join: true,
    container: "svg-viewbox",
    color: "#0b0b0b",
    background: "#ffffff",
    width: 512,
    height: 512,
  }).svg();
}

/** "Sat, Oct 11, 2:00 PM – 4:00 PM" — times are the wall clock a founder typed. */
export function eventWhen(starts: string, ends: string | null): string {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(starts));
  const clock = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(iso));
  return ends
    ? `${day} · ${clock(starts)} – ${clock(ends)}`
    : `${day} · ${clock(starts)}`;
}
