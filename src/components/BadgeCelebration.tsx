"use client";

import { useEffect, useState } from "react";
import type { Badge } from "@/lib/badges";
import { BadgeMedallion } from "@/components/BadgeMedallion";

/**
 * The badge unlock moment: confetti, a soft glow, and the patch presented
 * on a card — celebration with restraint (the UX spec allows one warm
 * flourish for acknowledgment moments). Badges are derived server-side;
 * which ones were already celebrated is remembered per-user in
 * localStorage, so each badge gets exactly one party.
 */

const CONFETTI_COLORS = [
  "#10b981", "#f59e0b", "#38bdf8", "#a78bfa", "#fb7185", "#a3e635",
];

function ConfettiField() {
  // Deterministic pseudo-random layout (index math, no Math.random) —
  // stable across renders and lint-clean.
  const pieces = Array.from({ length: 48 }, (_, i) => ({
    left: (i * 53 + 11) % 100,
    delay: ((i * 37) % 20) / 10,
    duration: 2.6 + ((i * 29) % 18) / 10,
    size: 5 + ((i * 13) % 3) * 3,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 4 === 0,
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.8,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            animation: `pa-confetti ${p.duration}s linear ${p.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

export function BadgeCelebration({
  badges,
  userId,
}: {
  badges: Badge[];
  userId: string;
}) {
  const [queue, setQueue] = useState<Badge[]>([]);
  const [idx, setIdx] = useState(0);

  const storageKey = `pa-badges-seen:${userId}`;

  useEffect(() => {
    // Deferred so the page paints first and the party makes an entrance.
    const t = setTimeout(() => {
      try {
        const seen = new Set<string>(
          JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[],
        );
        const fresh = badges.filter((b) => !seen.has(b.key));
        if (fresh.length > 0) setQueue(fresh);
      } catch {
        /* corrupted storage — skip the party, never break the page */
      }
    }, 400);
    return () => clearTimeout(t);
    // Badge list identity changes per render; key it by content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, badges.map((b) => b.key).join(",")]);

  if (queue.length === 0 || idx >= queue.length) return null;
  const badge = queue[idx];

  function dismiss() {
    try {
      const seen = new Set<string>(
        JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[],
      );
      seen.add(badge.key);
      localStorage.setItem(storageKey, JSON.stringify([...seen]));
    } catch {
      /* storage full/blocked — the worst case is a repeat party */
    }
    setIdx((i) => i + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-gradient-to-b from-sky-200/95 via-sky-100/95 to-emerald-50/95 p-4 dark:from-zinc-950/95 dark:via-zinc-900/95 dark:to-emerald-950/90"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-unlock-title"
    >
      <style>{`
        @keyframes pa-confetti {
          0% { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(112vh) rotate(680deg); opacity: 0.85; }
        }
        @keyframes pa-pop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pa-glow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.12); }
        }
      `}</style>

      <ConfettiField />

      <div
        className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-zinc-900"
        style={{ animation: "pa-pop 0.45s cubic-bezier(.2,.9,.3,1.2) both" }}
      >
        <h2 id="badge-unlock-title" className="text-xl font-semibold tracking-tight">
          New badge earned
        </h2>
        <p className="mt-1.5 text-sm text-black/55 dark:text-white/55">
          {badge.fact}.
        </p>

        <div className="relative mx-auto mt-6 flex h-48 w-48 items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${badge.from}55 0%, transparent 65%)`,
              animation: "pa-glow 2.4s ease-in-out infinite",
            }}
          />
          <BadgeMedallion badge={badge} size={150} />
        </div>

        <p className="mt-4 font-semibold">{badge.label}</p>
        <p className="mt-0.5 text-xs text-black/45 dark:text-white/45">
          Earned, never bought — it certifies something that really happened.
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-lg bg-pa-green px-6 py-3 text-sm font-medium text-pa-green-ink transition-colors hover:bg-pa-green-hover"
        >
          {idx + 1 < queue.length ? "Next badge →" : "Continue"}
        </button>
      </div>
    </div>
  );
}
