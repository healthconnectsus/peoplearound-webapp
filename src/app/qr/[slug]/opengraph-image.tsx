import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { hostedPage } from "../_hosted/pages";

/**
 * The card a shared /qr/<code> link unfurls into, for the codes that are
 * pages of their own: their mark on a warm white ground, their headline,
 * the address in small type. A link Elle texts to a friend should look like
 * Elle, not like us — the site's own card (src/app/opengraph-image.tsx)
 * would have put "do something with the people around you" over a trip to
 * Hawaii.
 */

export const alt = "A page on Peoplearound";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function QrOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = hostedPage(slug);
  if (!page) return new Response("Not found", { status: 404 });

  // The PNG twin of the mark (next/og draws PNG, not WebP), read from the
  // source tree — next.config.ts traces the folder into the function — and
  // handed over as a data URL. If it is not there after all, the name does
  // the work.
  const { og } = page.logo;
  let mark: string | null = null;
  try {
    const bytes = await readFile(join(process.cwd(), "src/app/qr/_hosted", og.file));
    mark = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    mark = null;
  }
  const markWidth = 520;
  const markHeight = Math.round((markWidth * og.height) / og.width);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fffaf6",
          backgroundImage: `radial-gradient(circle at 50% 0%, ${page.ink}2e, transparent 60%)`,
          color: page.ink,
          fontFamily: "sans-serif",
        }}
      >
        {mark ? (
          // eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not by a browser
          <img src={mark} width={markWidth} height={markHeight} alt="" />
        ) : (
          <div style={{ fontSize: 120, fontWeight: 700 }}>{page.name}</div>
        )}
        {page.kicker ? (
          <div
            style={{
              marginTop: 44,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {page.kicker}
          </div>
        ) : null}
        <div
          style={{
            marginTop: page.kicker ? 14 : 44,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {page.headline}
        </div>
        <div style={{ marginTop: 26, fontSize: 26, color: "rgba(59,42,46,0.6)" }}>
          {`peoplearound.com/qr/${slug}`}
        </div>
      </div>
    ),
    size,
  );
}
