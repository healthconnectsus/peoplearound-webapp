import type { Badge } from "@/lib/badges";

/**
 * A badge as a patch: the Peoplearound "P" silhouette in deep navy with a
 * pale outline, the achievement icon filling the bowl, a folded gradient
 * ribbon carrying the label, and a few celebratory specks — scout-patch
 * style (à la the Boulder patch / brand-letter badge references), sized for
 * real product UI. Pure SVG, no client JS.
 */

/** Split a label onto up to two ribbon lines at the most central space. */
function splitLabel(label: string): string[] {
  if (label.length <= 12) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    const diff = Math.abs(left - right);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export function BadgeMedallion({
  badge,
  size = 96,
}: {
  badge: Badge;
  size?: number;
}) {
  const uid = badge.key;
  const lines = splitLabel(badge.label.toUpperCase());
  return (
    <svg
      width={size}
      height={(size * 170) / 128}
      viewBox="0 0 128 170"
      role="img"
      aria-label={badge.label}
    >
      <defs>
        <linearGradient id={`ribbon-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={badge.from} />
          <stop offset="100%" stopColor={badge.to} />
        </linearGradient>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b4a75" />
          <stop offset="100%" stopColor="#1d3557" />
        </linearGradient>
        <filter id={`soft-${uid}`} x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#1d3557" floodOpacity="0.30" />
        </filter>
      </defs>

      <g filter={`url(#soft-${uid})`}>
        {/* The chunky "P" — pale outline pass, then body. fill-rule carves the bowl. */}
        {/* Stem runs well past the ribbon (y=96–130) so the P's foot stays
            visible below the banner, as in the brand mockups. */}
        <path
          d="M24,150 L24,22 Q24,14 32,14 L68,14 A42,42 0 1 1 68,98 L56,98 L56,150 Q56,158 48,158 L32,158 Q24,158 24,150 Z M68,38 A16,16 0 1 0 68,74 A16,16 0 1 0 68,38 Z"
          fillRule="evenodd"
          fill="none"
          stroke="#dbeafe"
          strokeWidth="9"
          strokeLinejoin="round"
        />
        <path
          d="M24,150 L24,22 Q24,14 32,14 L68,14 A42,42 0 1 1 68,98 L56,98 L56,150 Q56,158 48,158 L32,158 Q24,158 24,150 Z M68,38 A16,16 0 1 0 68,74 A16,16 0 1 0 68,38 Z"
          fillRule="evenodd"
          fill={`url(#body-${uid})`}
        />

        {/* Decorative specks in the badge's colors */}
        <circle cx="106" cy="30" r="3" fill={badge.from} opacity="0.9" />
        <circle cx="112" cy="72" r="2.2" fill={badge.to} opacity="0.8" />
        <circle cx="14" cy="46" r="2.4" fill={badge.from} opacity="0.7" />

        {/* The achievement icon, seated in the P's bowl */}
        <text
          x="68"
          y="67"
          textAnchor="middle"
          fontSize="30"
          style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.35))" }}
        >
          {badge.emoji}
        </text>

        {/* Folded ribbon: back flags first, then the band */}
        <polygon points="6,100 26,100 26,130 6,130 14,115" fill={badge.to} />
        <polygon points="6,100 26,100 26,130 6,130 14,115" fill="#000" opacity="0.28" />
        <polygon points="122,100 102,100 102,130 122,130 114,115" fill={badge.to} />
        <polygon points="122,100 102,100 102,130 122,130 114,115" fill="#000" opacity="0.28" />
        <rect x="18" y="96" width="92" height={lines.length === 2 ? 34 : 26} rx="4" fill={`url(#ribbon-${uid})`} />
        <rect x="18" y="96" width="92" height="4" rx="2" fill="#fff" opacity="0.22" />

        {lines.map((line, i) => (
          <text
            key={line}
            x="64"
            y={lines.length === 2 ? 110 + i * 12 : 113}
            textAnchor="middle"
            fontSize={lines.length === 2 ? 9.5 : 11}
            fontWeight="700"
            fill="#ffffff"
            style={{ letterSpacing: "0.04em" }}
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}
