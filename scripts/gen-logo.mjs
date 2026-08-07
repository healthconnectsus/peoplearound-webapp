// Brand wordmark generator — logo v6.1 "colored people, very bold around".
//
// "people": Quicksand Medium, one brand color per letter position (p/e
// repeat), letters overlapping 70 units (bbox-measured) at 0.88 opacity so
// the colors mix like layered glass. "around": Quicksand Bold, synthetically
// emboldened by an outward polygon offset with ROUND joins (preserves the
// rounded terminals), solid ink. Text is vectorized — no font ships.
//
// Regenerates: public/logo.svg (adaptive), public/logo-light.svg,
// public/logo-dark.svg, src/app/icon.svg (favicon tile).
//
// Usage (from repo root):
//   node scripts/gen-logo.mjs                     # shipped look (quicksand 15)
//   node scripts/gen-logo.mjs quicksand 25        # bolder "around"
//   node scripts/gen-logo.mjs poppins 0 out/      # variant into a directory
//
// The "leksen" variant is reserved for the commercially licensed Nordique
// Pro / Nordeco files (env LEKSEN_REGULAR + LEKSEN_BOLD). Never point it at
// demo/pirated copies, and never commit font files to this public repo —
// only the vectorized outlines below are shipped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import ClipperLib from "clipper-lib";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const F = path.join(ROOT, "node_modules", "@fontsource");

const VARIANT = process.argv[2] ?? "quicksand";
const EMBOLDEN = Number(process.argv[3] ?? (VARIANT === "quicksand" ? 15 : 0));
const OUT = process.argv[4] ?? null; // default: write the real assets in place

const VARIANTS = {
  // [people font (colored), around font (very bold ink)]
  quicksand: [`${F}/quicksand/files/quicksand-latin-500-normal.woff`, `${F}/quicksand/files/quicksand-latin-700-normal.woff`],
  poppins: [`${F}/poppins/files/poppins-latin-500-normal.woff`, `${F}/poppins/files/poppins-latin-800-normal.woff`],
  comfortaa: [`${F}/comfortaa/files/comfortaa-latin-400-normal.woff`, `${F}/comfortaa/files/comfortaa-latin-700-normal.woff`],
  leksen: [process.env.LEKSEN_REGULAR, process.env.LEKSEN_BOLD],
};
if (!VARIANTS[VARIANT] || !VARIANTS[VARIANT][0]) throw new Error(`variant ${VARIANT} unavailable (missing font path)`);
const peopleFont = opentype.loadSync(VARIANTS[VARIANT][0]);
const aroundFont = opentype.loadSync(VARIANTS[VARIANT][1]);

const SIZE = 1000;
// VISUAL bbox overlap per letter pair. Advance-based overlap gets eaten by
// side bearings (the recurring "forgot the overlap" trap) — place by bbox.
const OVERLAP = 70;
const OPACITY = 0.88;
const INK = "#58585C";      // gray, not black — the colored word is the hero
const INK_DARK = "#D4D4D8"; // dark mode: soft gray instead of full white
// One color per POSITION of "people" (letters repeat): p e o p l e
const COLORS = ["#F7554A", "#F9A215", "#14B487", "#4479E4", "#8A4BD8", "#F45495"];
// "around" spacing (all bbox-measured, applied after emboldening):
const WORD_GAP = 70;     // people's right edge → a's left edge
const TRACK = 40;        // tighten every natural letter gap by this much...
const MIN_GAP = 3;       // ...but never below this (r→o is nearly touching)

// Lay a word out glyph by glyph. overlap === 0: natural advances + kerning.
// overlap > 0: each glyph's bbox starts `overlap` units before the previous
// glyph's bbox ends — a guaranteed visual overlap independent of bearings.
function layout(font, word, startX, overlap = 0) {
  const slots = [];
  font.forEachGlyph(word, startX, 0, SIZE, { kerning: true }, (glyph, x) =>
    slots.push({ glyph, x }),
  );
  const placed = [];
  let cursor = null;
  for (const s of slots) {
    const nb = s.glyph.getPath(s.x, 0, SIZE).getBoundingBox();
    const x = overlap && cursor !== null ? s.x + (cursor - overlap - nb.x1) : s.x;
    const p = s.glyph.getPath(x, 0, SIZE);
    cursor = p.getBoundingBox().x2;
    placed.push({ d: p.toPathData(1), path: p, glyph: s.glyph, penX: x });
  }
  return placed;
}

// Synthetic bolding: flatten the outline (curves → segments) and offset it
// outward with round joins. Returns a replacement glyph object.
const CS = 1000; // clipper integer scale
function embolden(glyph, delta) {
  const polys = [];
  let cur = null, sx = 0, sy = 0, cx = 0, cy = 0;
  const push = (x, y) => cur.push({ X: Math.round(x * CS), Y: Math.round(y * CS) });
  for (const c of glyph.path.commands) {
    if (c.type === "M") { if (cur?.length > 2) polys.push(cur); cur = []; push(c.x, c.y); sx = cx = c.x; sy = cy = c.y; }
    else if (c.type === "L") { push(c.x, c.y); cx = c.x; cy = c.y; }
    else if (c.type === "Q") {
      for (let i = 1; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        push(u * u * cx + 2 * u * t * c.x1 + t * t * c.x, u * u * cy + 2 * u * t * c.y1 + t * t * c.y);
      }
      cx = c.x; cy = c.y;
    } else if (c.type === "C") {
      for (let i = 1; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        push(u * u * u * cx + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
             u * u * u * cy + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y);
      }
      cx = c.x; cy = c.y;
    } else if (c.type === "Z") { if (cur?.length > 2) polys.push(cur); cur = null; cx = sx; cy = sy; }
  }
  if (cur?.length > 2) polys.push(cur);

  const simple = ClipperLib.Clipper.SimplifyPolygons(polys, ClipperLib.PolyFillType.pftEvenOdd);
  const co = new ClipperLib.ClipperOffset(2, 0.25 * CS);
  co.AddPaths(simple, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out = new ClipperLib.Paths();
  co.Execute(out, delta * CS);
  if (!out.length) throw new Error("embolden erased a glyph");

  const d = out.map((poly) => {
    const pts = poly.map((p) => `${Number((p.X / CS).toFixed(1))} ${Number((p.Y / CS).toFixed(1))}`);
    return `M${pts[0]}${pts.slice(1).map((p) => `L${p}`).join("")}Z`;
  }).join("");
  const b = glyph.path.getBoundingBox();
  return {
    d,
    path: { getBoundingBox: () => ({ x1: b.x1 - delta, y1: b.y1 - delta, x2: b.x2 + delta, y2: b.y2 + delta }) },
  };
}

const union = (glyphs) =>
  glyphs.reduce(
    (acc, g) => {
      const b = g.path.getBoundingBox();
      return {
        x1: Math.min(acc.x1, b.x1), y1: Math.min(acc.y1, b.y1),
        x2: Math.max(acc.x2, b.x2), y2: Math.max(acc.y2, b.y2),
      };
    },
    { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity },
  );

// Shift a flattened M/L-only path (embolden output) horizontally.
const shiftD = (d, dx) =>
  d.replace(/([ML])(-?\d+(?:\.\d+)?) /g, (_, cmd, x) => `${cmd}${Number((Number(x) + dx).toFixed(1))} `);

const people = layout(peopleFont, "people", 0, OVERLAP);

// "around": natural layout → embolden → re-place by bbox so the word sits
// WORD_GAP after "people" and every letter gap tightens by TRACK (floored at
// MIN_GAP — the natural gaps are uneven, r's arm almost touches o already).
let around = layout(aroundFont, "around", 0);
if (EMBOLDEN > 0) around = around.map((g) => embolden(g, EMBOLDEN));

// Emboldening grows glyphs in every direction, leaving "around" ~2*EMBOLDEN
// taller than "people". Normalize: uniformly scale the emboldened word so its
// x-height band (o) lands exactly on people's (e). Same transform is applied
// to the favicon's "a" below.
let normS = 1, normA = 0;
if (EMBOLDEN > 0) {
  const pe = people[5].path.getBoundingBox(); // people's trailing e = x-height ref
  const ao = around[2].path.getBoundingBox(); // emboldened o
  normS = (pe.y2 - pe.y1) / (ao.y2 - ao.y1);
  normA = pe.y1 - normS * ao.y1;
}
const normalize = (g) => {
  if (normS === 1) return g;
  const b = g.path.getBoundingBox();
  return {
    d: g.d.replace(/([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
      (_, cmd, x, y) => `${cmd}${Number((normS * x).toFixed(1))} ${Number((normA + normS * y).toFixed(1))}`),
    path: { getBoundingBox: () => ({ x1: normS * b.x1, y1: normA + normS * b.y1, x2: normS * b.x2, y2: normA + normS * b.y2 }) },
  };
};
around = around.map(normalize);
{
  const boxes = around.map((g) => g.path.getBoundingBox());
  const naturalGaps = boxes.map((b, i) => (i === 0 ? 0 : b.x1 - boxes[i - 1].x2));
  let cursor = union(people).x2 + WORD_GAP;
  around = around.map((g, i) => {
    const b = boxes[i];
    const gap = i === 0 ? 0 : Math.max(naturalGaps[i] - TRACK, MIN_GAP);
    const dx = cursor + gap - b.x1;
    cursor = b.x2 + dx;
    if (EMBOLDEN > 0) {
      return { d: shiftD(g.d, dx), path: { getBoundingBox: () => ({ x1: b.x1 + dx, y1: b.y1, x2: b.x2 + dx, y2: b.y2 }) } };
    }
    // Curves present (no embolden): re-render the glyph at the shifted pen x.
    const p = g.glyph.getPath(g.penX + dx, 0, SIZE);
    return { d: p.toPathData(1), path: p };
  });
}

const bb = union([...people, ...around]);
const M = 40;
const vb = `${(bb.x1 - M).toFixed(1)} ${(bb.y1 - M).toFixed(1)} ${(bb.x2 - bb.x1 + 2 * M).toFixed(1)} ${(bb.y2 - bb.y1 + 2 * M).toFixed(1)}`;

const peoplePaths = people
  .map((g, i) => `<path fill="${COLORS[i]}" fill-opacity="${OPACITY}" d="${g.d}"/>`)
  .join("\n");
const aroundPaths = around.map((g) => `<path d="${g.d}"/>`).join("\n");

const wordmark = (inkOpen) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Peoplearound">
${peoplePaths}
${inkOpen}
${aroundPaths}
</g>
</svg>`;

const dest = (name) => {
  if (OUT) return path.join(OUT, name);
  return name === "icon.svg"
    ? path.join(ROOT, "src", "app", name)
    : path.join(ROOT, "public", name);
};
if (OUT) fs.mkdirSync(OUT, { recursive: true });

fs.writeFileSync(dest("logo.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Peoplearound">
<style>.ink{fill:${INK}}@media(prefers-color-scheme:dark){.ink{fill:${INK_DARK}}}</style>
${peoplePaths}
<g class="ink">
${aroundPaths}
</g>
</svg>`);
fs.writeFileSync(dest("logo-light.svg"), wordmark(`<g fill="${INK}">`));
fs.writeFileSync(dest("logo-dark.svg"), wordmark(`<g fill="${INK_DARK}">`));

// ---- favicon: white tile, overlapping "pa" (p colored glass, a bold ink) --
{
  const TILE = { x: -86, y: -850, w: 1003, h: 1003, rx: 221 };
  const p = layout(peopleFont, "p", 0);
  const pEnd = union(p).x2;
  const aSlots = [];
  aroundFont.forEachGlyph("a", 0, 0, SIZE, { kerning: true }, (glyph, x) => aSlots.push({ glyph, x }));
  const aNatural = aSlots[0].glyph.getPath(aSlots[0].x, 0, SIZE);
  const shift = pEnd - 45 - aNatural.getBoundingBox().x1; // 45-unit overlap
  const aPath = aSlots[0].glyph.getPath(aSlots[0].x + shift, 0, SIZE);
  let aGlyph = { d: aPath.toPathData(1), path: aPath };
  if (EMBOLDEN > 0) aGlyph = normalize(embolden(aGlyph, EMBOLDEN));

  const glyphs = [...p, aGlyph];
  const b = union(glyphs);
  const w = b.x2 - b.x1, h = b.y2 - b.y1;
  const s = Math.min((0.62 * TILE.w) / w, (0.62 * TILE.h) / h);
  const dx = TILE.x + TILE.w / 2 - s * (b.x1 + w / 2);
  const dy = TILE.y + TILE.h / 2 - s * (b.y1 + h / 2);
  fs.writeFileSync(dest("icon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${TILE.x} ${TILE.y} ${TILE.w} ${TILE.h}">
<rect x="${TILE.x}" y="${TILE.y}" width="${TILE.w}" height="${TILE.h}" rx="${TILE.rx}" fill="#ffffff"/>
<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${s.toFixed(4)})">
<path fill="${COLORS[0]}" fill-opacity="${OPACITY}" d="${p[0].d}"/>
<path fill="${INK}" d="${aGlyph.d}"/>
</g>
</svg>`);
}

console.log(`${VARIANT} embolden=${EMBOLDEN} → ${OUT ?? "public/ + src/app/"} (viewBox ${vb})`);
