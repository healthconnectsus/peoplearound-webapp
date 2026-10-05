import { ImageResponse } from "next/og";
import { eventWhen, publicEvent } from "@/lib/events";

/**
 * The card a shared event link unfurls into — in a WhatsApp group, a Slack,
 * an iMessage, a local newsletter.
 *
 * This is the other half of promoting an event: the QR gets it onto a
 * lamppost, this gets it into a group chat. Same three facts either way —
 * what, when, where — because that is what makes someone decide.
 */

export const alt = "An event near you on Peoplearound";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#008468";
const DEEPER = "#005f48";

export default async function EventOgImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const event = await publicEvent(code);

  const title = event?.title ?? "An event near you";
  const when = event ? eventWhen(event.starts_at, event.ends_at) : "";
  const where = event
    ? [event.place, event.community?.name].filter(Boolean).join(" · ")
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          background: `linear-gradient(135deg, ${BRAND} 0%, ${DEEPER} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {event?.community?.name
              ? `Happening in ${event.community.name}`
              : "Happening near you"}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: title.length > 48 ? 64 : 80,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              // Three lines of a long title, then it stops.
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {when ? (
            <div style={{ fontSize: 40, fontWeight: 600 }}>{when}</div>
          ) : null}
          {where ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {where}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 28,
              fontSize: 24,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            peoplearound.com — neighbors starting things together
          </div>
        </div>
      </div>
    ),
    size,
  );
}
