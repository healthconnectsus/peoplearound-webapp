"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type { FlyerCopy } from "@/lib/flyer-copy";
import { FLYER_STYLES, type FlyerStyleKey } from "@/lib/flyer-styles";

/**
 * The flyer itself: one A4 sheet, drawn once for the screen and the printer.
 *
 * Every size on it is a fraction of its own width (`cqw`), so the same
 * markup is a thumbnail, a full preview, and a 194mm-wide sheet on paper —
 * the browser scales it. The code is vector, in the flyer's own ink.
 *
 * A sheet does not scroll, so the words have to fit. The text block's sizes
 * are all multiplied by `--k`: an estimate from the amount of text sets it
 * before the first paint, then a measurement shrinks it a step at a time
 * until nothing overflows. Past a point the photo gives up height before the
 * type gets smaller still — on paper the words matter more than the picture.
 * Long copy gets smaller type; it never gets cut. Proportional sizing means a
 * fit on screen is a fit on paper.
 */

export type FlyerProps = {
  copy: FlyerCopy;
  style: FlyerStyleKey;
  /** "Capitol Hill · Denver" */
  eyebrow: string;
  /** "🌳 Outdoors" */
  kind: string;
  nextUp: { title: string; when: string; place: string | null } | null;
  /** Everyone building it, founder included. */
  team: number;
  /** The page the code opens; null until the project is published. */
  url: string | null;
  /** The code as SVG markup, in this style's ink; null until published. */
  qrSvg: string | null;
  photoUrl?: string | null;
};

/** Text block height at --k = 1, in cqw, from a rough lines-of-text model. */
function estimateHeight(copy: FlyerCopy, hasNext: boolean): number {
  const width = 87; // the sheet minus its side margins
  const lines = (text: string, size: number) =>
    Math.max(1, Math.ceil(text.length / (width / (size * 0.52))));
  let h = lines(copy.headline, 9) * 9.2;
  if (copy.subline) h += 2.6 + lines(copy.subline, 3.9) * 4.9;
  if (copy.body) h += 2.8 + lines(copy.body, 3.05) * 4.45;
  if (copy.bullets.length) {
    h += 3 + copy.bullets.reduce((sum, b) => sum + lines(b, 3.05) * 4.15 + 1.3, 0);
  }
  if (hasNext) h += 21;
  return h;
}

const ROOM = { withPhoto: 61, plain: 89 } as const;
const PHOTO = 28; // cqw
/** Below this the photo shrinks first, then the type goes on down to MIN_K. */
const KEEP_K = 0.72;
const MIN_K = 0.5;

function initialScale(copy: FlyerCopy, hasNext: boolean, hasPhoto: boolean): number {
  const room = hasPhoto ? ROOM.withPhoto : ROOM.plain;
  const k = room / estimateHeight(copy, hasNext);
  return Math.max(KEEP_K, Math.min(1, Math.floor(k * 100) / 100));
}

/** A size that follows the fit. */
const z = (cqw: number) => `calc(${cqw}cqw * var(--k))`;

export function Flyer({
  copy,
  style,
  eyebrow,
  kind,
  nextUp,
  team,
  url,
  qrSvg,
  photoUrl,
}: FlyerProps) {
  const s = FLYER_STYLES[style];
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const k0 = initialScale(copy, Boolean(nextUp), Boolean(photoUrl));

  // Measure and shrink. Writes the variable straight to the element: a
  // re-render per step would be a dozen renders per keystroke for nothing.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    if (!root || !text) return;
    const over = () => text.scrollHeight > text.clientHeight;
    const set = (name: string, v: number) => root.style.setProperty(name, String(v));
    const fit = () => {
      let k = k0;
      let ph = PHOTO;
      set("--k", k);
      set("--ph", ph);
      while (over() && k > KEEP_K) set("--k", (k = Math.max(KEEP_K, Math.round((k - 0.03) * 100) / 100)));
      while (over() && ph > 0) set("--ph", (ph = Math.max(0, ph - 4)));
      while (over() && k > MIN_K) set("--k", (k = Math.max(MIN_K, Math.round((k - 0.03) * 100) / 100)));
    };
    fit();
    // The web font arriving changes every measurement.
    document.fonts?.ready.then(fit).catch(() => {});
  });

  const root: CSSProperties & Record<string, string | number> = {
    "--k": k0,
    "--ph": PHOTO,
    containerType: "inline-size",
    aspectRatio: "210 / 297",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    background: s.paper,
    color: s.ink,
    overflow: "hidden",
    fontFamily: "var(--font-sans), Roboto, system-ui, sans-serif",
    // The band and the bullets are the design; a printer that drops
    // backgrounds to save toner would print a different flyer.
    printColorAdjust: "exact",
    WebkitPrintColorAdjust: "exact",
  };

  return (
    <div ref={rootRef} className="flyer" style={root} aria-label="Flyer">
      <div
        style={{
          background: s.accent,
          color: s.accentInk,
          padding: "3cqw 6.5cqw",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "3cqw",
          fontSize: "2.5cqw",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          flex: "0 0 auto",
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {eyebrow}
        </span>
        <span style={{ letterSpacing: "0.02em", textTransform: "none", fontWeight: 500, whiteSpace: "nowrap" }}>
          {kind}
        </span>
      </div>

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the project's own photo, printed as-is
        <img
          src={photoUrl}
          alt=""
          style={{ width: "100%", height: "calc(var(--ph) * 1cqw)", objectFit: "cover", display: "block", flex: "0 0 auto" }}
        />
      ) : null}

      <div
        ref={textRef}
        style={{ padding: "5cqw 6.5cqw 1cqw", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: z(9),
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            overflowWrap: "anywhere",
          }}
        >
          {copy.headline}
        </h2>

        {copy.subline ? (
          <p style={{ margin: `${z(2.6)} 0 0`, fontSize: z(3.9), lineHeight: 1.25, fontWeight: 600 }}>
            {copy.subline}
          </p>
        ) : null}

        {copy.body ? (
          <p style={{ margin: `${z(2.8)} 0 0`, fontSize: z(3.05), lineHeight: 1.45 }}>{copy.body}</p>
        ) : null}

        {copy.bullets.length ? (
          <ul style={{ margin: `${z(3)} 0 0`, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: z(1.3) }}>
            {copy.bullets.map((b, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: z(2.2), fontSize: z(3.05), lineHeight: 1.35 }}>
                <span
                  aria-hidden
                  style={{ width: z(1.7), height: z(1.7), borderRadius: "50%", background: s.accent, flex: "0 0 auto", marginTop: z(1.2) }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {nextUp ? (
          <div
            style={{
              marginTop: z(3.6),
              border: `0.35cqw solid ${s.accent}`,
              borderRadius: "2cqw",
              padding: `${z(2.2)} ${z(3.2)}`,
            }}
          >
            <p style={{ margin: 0, fontSize: z(2.2), letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, color: s.accent }}>
              Next up
            </p>
            <p style={{ margin: `${z(0.8)} 0 0`, fontSize: z(3.4), fontWeight: 700, lineHeight: 1.2 }}>{nextUp.title}</p>
            <p style={{ margin: `${z(0.6)} 0 0`, fontSize: z(2.8), color: s.muted, lineHeight: 1.3 }}>
              {nextUp.when}
              {nextUp.place ? ` · ${nextUp.place}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      <div
        style={{
          flex: "0 0 auto",
          margin: "3.5cqw 6.5cqw 0",
          padding: "3.5cqw 0 4.5cqw",
          borderTop: `0.4cqw solid ${s.accent}`,
          display: "flex",
          alignItems: "center",
          gap: "5cqw",
        }}
      >
        <div style={{ width: "26cqw", height: "26cqw", flex: "0 0 auto" }}>
          {qrSvg ? (
            <div
              role="img"
              aria-label={url ? `QR code linking to ${url}` : "QR code"}
              style={{ width: "100%", height: "100%" }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                border: `0.4cqw dashed ${s.muted}`,
                borderRadius: "2cqw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "3cqw",
                fontSize: "2.4cqw",
                lineHeight: 1.3,
                color: s.muted,
              }}
            >
              The code appears here once the project is published
            </div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <p style={{ margin: 0, fontSize: "4.1cqw", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.01em" }}>
            {copy.cta}
          </p>
          {url ? (
            <p style={{ margin: "1.6cqw 0 0", fontSize: "2.6cqw", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: s.muted, overflowWrap: "anywhere" }}>
              {url.replace(/^https?:\/\//, "")}
            </p>
          ) : null}
          <p style={{ margin: "1.8cqw 0 0", fontSize: "2.6cqw", color: s.muted, lineHeight: 1.35 }}>
            {team >= 2
              ? `${team} neighbors are already building this.`
              : "Be the first neighbor to join."}
          </p>
          <p style={{ margin: "1.2cqw 0 0", fontSize: "2.2cqw", color: s.muted }}>
            peoplearound.com · neighbors starting things together
          </p>
        </div>
      </div>
    </div>
  );
}
