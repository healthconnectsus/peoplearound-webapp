import { ImageResponse } from "next/og";
import { publicProject } from "@/lib/flyer";
import { CATEGORY_META } from "@/lib/projects";

/**
 * The card a shared project link unfurls into — in a WhatsApp group, a
 * Slack, an iMessage. The flyer's own headline when there is one, so the
 * chat and the lamppost say the same thing.
 */

export const alt = "A project near you on Peoplearound";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#008282";
const DEEPER = "#006969";

export default async function ProjectOgImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const project = await publicProject(code);

  const title = project?.flyer?.headline ?? project?.title ?? "A project near you";
  const subline =
    project?.flyer?.subline ??
    (project?.description ? project.description.slice(0, 140) : "");
  const cat = project
    ? (CATEGORY_META[project.category as keyof typeof CATEGORY_META]?.label ?? project.category)
    : "";
  const where = project?.community?.name
    ? `${cat ? `${cat} · ` : ""}${project.community.name}`
    : cat;
  const people = project
    ? project.team === 1
      ? "1 neighbor is building this"
      : `${project.team} neighbors are building this`
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
            {where ? `Starting in ${where}` : "Starting near you"}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: title.length > 48 ? 64 : 80,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
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
          {subline ? (
            <div
              style={{
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {subline}
            </div>
          ) : null}
          {people ? (
            <div style={{ marginTop: 10, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>{people}</div>
          ) : null}
          <div style={{ marginTop: 28, fontSize: 24, color: "rgba(255,255,255,0.65)" }}>
            peoplearound.com — neighbors starting things together
          </div>
        </div>
      </div>
    ),
    size,
  );
}
