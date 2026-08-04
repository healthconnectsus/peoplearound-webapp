import { notFound } from "next/navigation";
import { BadgeMedallion } from "@/components/BadgeMedallion";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import type { Badge } from "@/lib/badges";

/**
 * DEV ONLY — visual gallery for the badge patches and the unlock
 * celebration. 404s in production; whitelisted in the proxy only outside
 * production.
 */

const SAMPLES: Badge[] = [
  { key: "founding", label: "Founding Neighbor", fact: "One of the first 10 in Aurora", emoji: "🌱", from: "#34d399", to: "#0d9488" },
  { key: "first-help", label: "First Confirmed Help", fact: "A neighbor confirmed your first contribution", emoji: "🛠️", from: "#fbbf24", to: "#ea580c" },
  { key: "trusted-hands", label: "Trusted Hands", fact: "5 contributions confirmed by neighbors", emoji: "🤲", from: "#a78bfa", to: "#7c3aed" },
  { key: "witness", label: "Witness", fact: "Attested 3 neighbors' contributions", emoji: "👀", from: "#38bdf8", to: "#2563eb" },
  { key: "showed-up", label: "Showed Up", fact: "Presence at an event, confirmed by the team", emoji: "🙋", from: "#fb7185", to: "#e11d48" },
  { key: "made-real", label: "Made It Real", fact: "Founded a project a team carried to completion", emoji: "💡", from: "#818cf8", to: "#6d28d9" },
  { key: "brought-neighbors", label: "Brought the Neighbors", fact: "3 people joined through your invite", emoji: "🌟", from: "#a3e635", to: "#16a34a" },
];

export default function DevBadgesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-xl font-semibold">Badge gallery (dev)</h1>
      <ul className="mt-8 grid grid-cols-3 gap-8 sm:grid-cols-4">
        {SAMPLES.map((b) => (
          <li key={b.key} className="flex flex-col items-center text-center">
            <BadgeMedallion badge={b} />
            <p className="mt-2 text-xs font-medium">{b.label}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-12 text-lg font-semibold">Celebration</h2>
      <p className="text-sm text-black/50">
        Clear localStorage key <code>pa-badges-seen:dev</code> and reload to
        replay.
      </p>
      <BadgeCelebration badges={SAMPLES.slice(0, 2)} userId="dev" />
    </main>
  );
}
