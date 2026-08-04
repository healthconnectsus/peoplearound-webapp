import type { Badge } from "@/lib/badges";

/**
 * A badge as a sleek medallion: gradient disc, fine metallic ring, glossy
 * top-light, soft drop shadow — sized for real product UI, not a game HUD.
 * Pure SVG, no client JS.
 */
export function BadgeMedallion({
  badge,
  size = 72,
}: {
  badge: Badge;
  size?: number;
}) {
  const uid = badge.key; // gradient ids must be unique per badge on the page
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label={badge.label}
    >
      <defs>
        <radialGradient id={`disc-${uid}`} cx="35%" cy="28%" r="85%">
          <stop offset="0%" stopColor={badge.from} />
          <stop offset="100%" stopColor={badge.to} />
        </radialGradient>
        <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`shadow-${uid}`} x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="3"
            floodColor={badge.to}
            floodOpacity="0.45"
          />
        </filter>
      </defs>

      <g filter={`url(#shadow-${uid})`}>
        {/* metallic ring */}
        <circle cx="36" cy="36" r="33" fill={`url(#ring-${uid})`} />
        {/* gradient disc */}
        <circle cx="36" cy="36" r="30" fill={`url(#disc-${uid})`} />
        {/* inner hairline */}
        <circle
          cx="36"
          cy="36"
          r="30"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        {/* glossy top light */}
        <ellipse cx="36" cy="21" rx="22" ry="12" fill={`url(#gloss-${uid})`} />
      </g>

      <text
        x="36"
        y="44"
        textAnchor="middle"
        fontSize="26"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.25))" }}
      >
        {badge.emoji}
      </text>
    </svg>
  );
}
