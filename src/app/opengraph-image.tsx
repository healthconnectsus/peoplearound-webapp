import { ImageResponse } from "next/og";

/**
 * The card every shared link gets.
 *
 * There was none, so a link posted into a neighborhood WhatsApp group, a
 * Slack, or a local newsletter arrived as a bare grey rectangle with a URL —
 * on a product whose entire distribution plan is neighbors sending each other
 * links. This is the default for the whole site; a page that wants its own
 * can add its own `opengraph-image` beside it.
 *
 * Drawn rather than served as a file so it stays in the repository next to
 * the words it carries, and so the brand colour has one definition.
 */
export const alt =
  "Peoplearound — do something with the people around you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The teal lobe of the mark (see globals.css --color-pa-brand).
const BRAND = "#008468";
const DEEPER = "#005f48";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: `linear-gradient(135deg, ${BRAND} 0%, ${DEEPER} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 82,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Peoplearound
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 40,
            lineHeight: 1.25,
            color: "rgba(255,255,255,0.92)",
            maxWidth: 820,
          }}
        >
          Do something with the people around you.
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 26,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          Neighbors start things. Everyone who helps is credited.
        </div>
      </div>
    ),
    size,
  );
}
