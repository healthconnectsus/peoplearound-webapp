"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { UsersRound, Sprout, Rocket, type LucideIcon } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_META,
  HELP_KINDS,
  HELP_META,
  REACHES,
  REACH_META,
  type HelpKind,
  type ProjectReach,
} from "@/lib/projects";
import { createProject } from "../actions";
import { MapPicker } from "@/components/MapPicker";
import { PhotoPicker } from "@/components/PhotoPicker";

type Draft = {
  title: string;
  description: string;
  category: string;
  state: "idea" | "active";
  tip: string;
};

/* Minimal typings for the Web Speech API (not in lib.dom for all targets). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/* Mic support never changes after load; useSyncExternalStore keeps SSR (no
   mic) and the client in sync without setState-in-effect. */
const noopSubscribe = () => () => {};
function useMicSupported() {
  return useSyncExternalStore(
    noopSubscribe,
    () => getSpeechRecognition() !== null,
    () => false,
  );
}

const inputClass =
  "rounded-xl border border-black/15 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-emerald-500 dark:border-white/20";

const cardLabelClass =
  "flex h-full cursor-pointer flex-col gap-0.5 rounded-xl border border-black/15 px-4 py-3 text-base transition-colors hover:bg-black/5 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:border-white/20 dark:hover:bg-white/10 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40";

const STEPS = ["What is it", "Your idea", "The basics", "Who can help", "Share"] as const;

/**
 * Step 0: what kind of thing is this? The choice doesn't create a different
 * data model — it tunes the words on the steps that follow (placeholder,
 * examples, default category) and tells the AI shaper what register to write
 * in. A walking-buddy post and a community-garden post shouldn't sound alike.
 */
type Intent = "meet" | "community" | "personal";

const INTENTS: {
  key: Intent;
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Prefills the category chip on "The basics". */
  category: string;
  placeholder: string;
  /** Front and back of the flip card. */
  tint: { front: string; iconBox: string; icon: string; back: string };
  /** Shown on the card's back on hover — a real-sounding post of this kind. */
  example: { title: string; desc: string; by: string; photo: string };
}[] = [
  {
    key: "meet",
    icon: UsersRound,
    title: "Meet people over an activity",
    desc: "A walk, a game night, a running buddy — the point is the company.",
    category: "other",
    placeholder: "e.g. “I'd love a Sunday morning walking group, max 20 people…”",
    tint: {
      front: "bg-gradient-to-br from-sky-500 to-sky-700",
      iconBox: "bg-white/20",
      icon: "text-white",
      back: "bg-sky-800",
    },
    example: {
      title: "Neighborhood walk",
      desc: "Start a neighborhood Sunday morning walk with a maximum of 20 people",
      by: "Jonathan Hammer",
      photo: "/faces/jonathan.webp",
    },
  },
  {
    key: "community",
    icon: Sprout,
    title: "An idea for the community",
    desc: "A garden, a mural, a pantry — something the neighborhood builds and keeps.",
    category: "community",
    placeholder: "e.g. “the empty lot near the bakery could be a garden…”",
    tint: {
      front: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      iconBox: "bg-white/20",
      icon: "text-white",
      back: "bg-emerald-800",
    },
    example: {
      title: "Community garden",
      desc: "Turn the empty lot on 6th into raised beds we plant together",
      by: "Rosa Alvarez",
      photo: "/faces/rosa.webp",
    },
  },
  {
    key: "personal",
    icon: Rocket,
    title: "A personal project",
    desc: "Your own build, venture, or goal — and the hands or company to move it.",
    category: "venture",
    placeholder: "e.g. “I'm starting a tiny bakery and could use a hand on Saturdays…”",
    tint: {
      front: "bg-gradient-to-br from-violet-500 to-violet-700",
      iconBox: "bg-white/20",
      icon: "text-white",
      back: "bg-violet-800",
    },
    example: {
      title: "Tiny bakery test",
      desc: "I bake twenty loaves every Saturday — help me try selling them at the market",
      by: "Anna Kowalski",
      photo: "/faces/anna.webp",
    },
  },
];

/** Inspiration rail for the talk-it-out step — tap one to start from it. */
const EXAMPLES: { title: string; desc: string; by: string; intent: Intent }[] = [
  { title: "Neighborhood walk", desc: "Start a neighborhood Sunday morning walk with a maximum of 20 people", by: "Jonathan Hammer", intent: "meet" },
  { title: "Community garden", desc: "Turn the empty lot on 6th into raised beds we plant together", by: "Rosa Alvarez", intent: "community" },
  { title: "Repair café", desc: "One Saturday a month we fix broken toasters, hems and bikes together", by: "Miguel Torres", intent: "community" },
  { title: "Little free pantry", desc: "A weatherproof box on my fence anyone can give to or take from", by: "Priya Natarajan", intent: "community" },
  { title: "Tool library", desc: "My garage full of tools becomes the street's lending shelf", by: "Marcus Reed", intent: "community" },
  { title: "Skill swap evenings", desc: "You teach me Excel, I teach you guitar — Thursdays at the library", by: "Ken Osei", intent: "meet" },
  { title: "Street mural", desc: "Paint the gray underpass with a design the kids help choose", by: "Lily Zhang", intent: "community" },
  { title: "Dog-walking pool", desc: "Match shift workers' dogs with neighbors who'd love a walk buddy", by: "Dana Whitfield", intent: "meet" },
  { title: "Senior tech hour", desc: "Help older neighbors video-call their grandkids, one hour a week", by: "Fatima El-Sayed", intent: "community" },
  { title: "Block potluck", desc: "A first-Friday potluck where every house brings one dish", by: "Sam Novak", intent: "meet" },
  { title: "Tiny bakery test", desc: "I bake twenty loaves every Saturday — help me try selling them at the market", by: "Anna Kowalski", intent: "personal" },
  { title: "Backyard sauna build", desc: "Building a small sauna this fall — trading pizza for a hand with the framing", by: "Leo Virtanen", intent: "personal" },
  { title: "First 10K", desc: "Training for my first 10K and looking for someone to keep me honest", by: "Grace Adeyemi", intent: "personal" },
  { title: "Board-game prototype", desc: "I designed a card game and need honest playtesters, one evening a month", by: "Tom Becker", intent: "personal" },
];

type PlaybookSeed = {
  title: string;
  description: string;
  category: string;
  help: HelpKind;
  tip: string;
};

export function IdeaForm({
  error,
  userId,
  playbook = null,
  center = null,
}: {
  error?: string;
  userId: string;
  /** Arriving from a playbook: skip step 1 with the draft already filled. */
  playbook?: PlaybookSeed | null;
  /** Opens the pin map on your neighborhood rather than the whole planet. */
  center?: { lat: number; lng: number } | null;
}) {
  // Playbooks are community ideas by definition — they arrive with the
  // draft filled, so they skip straight to "The basics".
  const [step, setStep] = useState(playbook ? 2 : 0);
  const [intent, setIntent] = useState<Intent | null>(
    playbook ? "community" : null,
  );

  // --- Step 1: talk it out ---
  const [rawIdea, setRawIdea] = useState("");
  const [listening, setListening] = useState(false);
  const micSupported = useMicSupported();
  const [shaping, setShaping] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(playbook?.tip ?? null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // --- Steps 2–3: the draft ---
  const [title, setTitle] = useState(playbook?.title ?? "");
  const [description, setDescription] = useState(playbook?.description ?? "");
  const [category, setCategory] = useState<string>(
    playbook?.category ?? CATEGORIES[0],
  );
  const [state, setState] = useState<"idea" | "active">("idea");
  const [help, setHelp] = useState<HelpKind>(playbook?.help ?? "local");
  const [reach, setReach] = useState<ProjectReach>("neighborhood");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) text += r[0].transcript;
      }
      if (text) {
        setRawIdea((prev) =>
          prev ? `${prev.trim()} ${text.trim()}` : text.trim(),
        );
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function shapeIdea() {
    setShaping(true);
    setAiError(null);
    setTip(null);
    try {
      const res = await fetch("/api/shape-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: rawIdea, intent }),
      });
      const data = (await res.json()) as Partial<Draft> & { error?: string };
      if (!res.ok) {
        setAiError(data.error ?? "Something went wrong — please try again.");
        return;
      }
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      if (
        data.category &&
        (CATEGORIES as readonly string[]).includes(data.category)
      ) {
        setCategory(data.category);
      }
      setState(data.state === "active" ? "active" : "idea");
      if (data.tip) setTip(data.tip);
      setStep(2); // straight to the prefilled draft
    } catch {
      setAiError("Couldn't reach the assistant — check your connection.");
    } finally {
      setShaping(false);
    }
  }

  const canContinueFromBasics = title.trim().length > 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-start lg:gap-10">
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <ol className="flex items-center gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-2">
            <span
              className={`h-1.5 rounded-full transition-colors ${
                i <= step
                  ? "bg-emerald-600"
                  : "bg-black/10 dark:bg-white/15"
              }`}
            />
            <span
              className={`flex items-center gap-1.5 text-base font-bold ${
                i === step
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-black/45 dark:text-white/45"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i <= step
                    ? "bg-emerald-600 text-white"
                    : "bg-black/10 text-black/50 dark:bg-white/15 dark:text-white/50"
                }`}
              >
                {i + 1}
              </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {/* ---- Step 1: what are we talking about? ---- */}
      {step === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-2xl font-extrabold">What are we talking about?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {INTENTS.map((it) => {
              const Icon = it.icon;
              return (
                /* Flip card: front says what the kind is, hover turns it
                   over to show a real post of that kind. Click picks it. */
                <button
                  key={it.key}
                  type="button"
                  onClick={() => {
                    setIntent(it.key);
                    setCategory(it.category);
                    setStep(1);
                  }}
                  className="group relative h-64 text-left [perspective:1000px]"
                >
                  <span
                    className="relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]"
                  >
                    {/* Front */}
                    <span
                      className={`absolute inset-0 flex flex-col items-start gap-3 rounded-2xl p-5 text-white shadow-md [backface-visibility:hidden] ${it.tint.front}`}
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${it.tint.iconBox}`}
                      >
                        <Icon
                          className={`h-6 w-6 ${it.tint.icon}`}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </span>
                      <span className="text-lg font-bold leading-snug">
                        {it.title}
                      </span>
                      <span className="text-sm leading-relaxed text-white/85">
                        {it.desc}
                      </span>
                    </span>
                    {/* Back: one real-sounding example of this kind */}
                    <span
                      className={`absolute inset-0 flex flex-col rounded-2xl p-5 text-white shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] ${it.tint.back}`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                        <span className="text-base font-bold">
                          {it.example.title}
                        </span>
                      </span>
                      <span className="mt-2 text-sm leading-relaxed text-white/90">
                        “{it.example.desc}”
                      </span>
                      <span className="mt-auto flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset */}
                        <img
                          src={it.example.photo}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full border-2 border-white/70 object-cover"
                        />
                        <span className="text-sm font-medium text-white/90">
                          {it.example.by}
                        </span>
                      </span>
                      <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/70">
                        Start one like this →
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-black/45 dark:text-white/45">
            Not sure? Pick the closest — nothing here locks you in.
          </p>
        </div>
      ) : null}

      {/* ---- Step 2: your idea, in your own words ---- */}
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50/50 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
            <p className="text-2xl font-extrabold">💬 Just talk it out</p>
            <p className="mt-0.5 text-base text-black/60 dark:text-white/60">
              Your words, messy is fine — we&apos;ll shape the post.
            </p>

            <textarea
              value={rawIdea}
              onChange={(e) => setRawIdea(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder={
                INTENTS.find((it) => it.key === intent)?.placeholder ??
                "e.g. “the empty lot near the bakery could be a garden…”"
              }
              className={`${inputClass} mt-3 w-full resize-y bg-white dark:bg-black/20`}
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {micSupported ? (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`rounded-full border px-5 py-2.5 text-base font-medium transition-colors ${
                    listening
                      ? "border-red-400 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-300"
                      : "border-black/15 bg-white hover:bg-black/5 dark:border-white/20 dark:bg-black/20 dark:hover:bg-white/10"
                  }`}
                >
                  {listening ? "⏹ Stop" : "🎤 Speak"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={shapeIdea}
                disabled={shaping || rawIdea.trim().length < 10}
                className="rounded-full bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shaping ? "Shaping…" : "✨ Shape my idea"}
              </button>
              {listening ? (
                <span className="text-sm text-red-600 dark:text-red-400">
                  Listening — speak freely…
                </span>
              ) : null}
            </div>

            {aiError ? (
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {aiError}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {aiError ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-base text-black/50 hover:underline dark:text-white/50"
              >
                Continue without AI →
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              ← Back
            </button>
          </div>
        </div>
      ) : null}

      {/* ---- Step 3: the basics ---- */}
      {step === 2 ? (
        <div className="flex flex-col gap-5">
          {tip ? (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              💡 {tip}
            </p>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xl font-extrabold">
              {intent === "meet"
                ? "What do you want to do together?"
                : intent === "personal"
                  ? "What's your project?"
                  : "What's the idea?"}
            </span>
            <input
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                intent === "meet"
                  ? "Sunday morning walking group, 8am at the park"
                  : intent === "personal"
                    ? "Help me build my backyard sauna this fall"
                    : "Start a community garden on Oak Street"
              }
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xl font-extrabold">
              Tell people more{" "}
              <span className="text-sm font-normal text-black/40 dark:text-white/40">
                (optional)
              </span>
            </span>
            <textarea
              rows={5}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the plan? What help do you need?"
              className={`${inputClass} resize-y`}
            />
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-xl font-extrabold">
              A photo{" "}
              <span className="text-sm font-normal text-black/40 dark:text-white/40">
                (optional)
              </span>
            </legend>
            <PhotoPicker
              userId={userId}
              value={photoUrl}
              onChange={setPhotoUrl}
              label="Add a photo of the place or the thing"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-xl font-extrabold">
              What kind of project is it?
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    checked={category === c}
                    onChange={() => setCategory(c)}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-black/15 px-3.5 py-1.5 transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-xl font-extrabold">Where are you at?</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className={`flex-1 ${cardLabelClass}`}>
                <input
                  type="radio"
                  checked={state === "idea"}
                  onChange={() => setState("idea")}
                  className="sr-only"
                />
                <span className="font-medium">💭 Just an idea</span>
                <span className="text-xs text-black/50 dark:text-white/50">
                  Looking for people to make it real
                </span>
              </label>
              <label className={`flex-1 ${cardLabelClass}`}>
                <input
                  type="radio"
                  checked={state === "active"}
                  onChange={() => setState("active")}
                  className="sr-only"
                />
                <span className="font-medium">🚀 Already building</span>
                <span className="text-xs text-black/50 dark:text-white/50">
                  Under way — more hands welcome
                </span>
              </label>
            </div>
          </fieldset>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canContinueFromBasics}
              className="rounded-full bg-emerald-600 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue →
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              ← Back
            </button>
          </div>
        </div>
      ) : null}

      {/* ---- Step 4: who can help ---- */}
      {step === 3 ? (
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-xl font-extrabold">
              What kind of help do you need?
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              {HELP_KINDS.map((h) => (
                <label key={h} className={`flex-1 ${cardLabelClass}`}>
                  <input
                    type="radio"
                    checked={help === h}
                    onChange={() => setHelp(h)}
                    className="sr-only"
                  />
                  <span className="font-medium">
                    {HELP_META[h].emoji} {HELP_META[h].label}
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {HELP_META[h].hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-xl font-extrabold">
              Who should be able to find and join it?
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              {REACHES.map((r) => (
                <label key={r} className={`flex-1 ${cardLabelClass}`}>
                  <input
                    type="radio"
                    checked={reach === r}
                    onChange={() => setReach(r)}
                    className="sr-only"
                  />
                  <span className="font-medium">
                    {REACH_META[r].emoji} {REACH_META[r].label}
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {REACH_META[r].hint}
                  </span>
                </label>
              ))}
            </div>
            {reach !== "neighborhood" ? (
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Neighbors still see it first.
              </p>
            ) : null}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-xl font-extrabold">
              Where is it happening?{" "}
              <span className="font-normal text-black/40 dark:text-white/40">
                (optional)
              </span>
            </legend>
            <MapPicker value={loc} onChange={setLoc} center={center} />
          </fieldset>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-full bg-emerald-600 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Continue →
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              ← Back
            </button>
          </div>
        </div>
      ) : null}

      {/* ---- Step 5: review & share ---- */}
      {step === 4 ? (
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            {photoUrl ? (
              <div
                aria-hidden
                className="h-44 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${photoUrl})` }}
              />
            ) : null}
            <div className="p-4">
            <p className="font-medium leading-snug">
              <span className="mr-1.5" aria-hidden>
                {CATEGORY_META[category as (typeof CATEGORIES)[number]]
                  ?.emoji ?? "✨"}
              </span>
              {title}
            </p>
            {description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">
                {description}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/50 dark:text-white/50">
              <span>{state === "active" ? "🚀 Already building" : "💭 Just an idea"}</span>
              <span>
                {HELP_META[help].emoji} {HELP_META[help].label}
              </span>
              <span>
                {REACH_META[reach].emoji} {REACH_META[reach].label}
              </span>
              {loc ? <span>📍 Pinned on the map</span> : null}
            </p>
            </div>
          </div>

          <form action={createProject} className="flex items-center gap-3">
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="help" value={help} />
            <input type="hidden" name="reach" value={reach} />
            <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
            <input type="hidden" name="lat" value={loc?.lat ?? ""} />
            <input type="hidden" name="lng" value={loc?.lng ?? ""} />
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Share it 🎉
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              ← Back
            </button>
            <Link
              href="/"
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              Cancel
            </Link>
          </form>
        </div>
      ) : null}
    </div>

    {/* Inspiration rail — talk-it-out step only, matched to the intent you
        just picked; tap an example to start from it. */}
    {step === 1 ? (
      <aside className="hidden lg:block">
        <h2 className="text-xl font-extrabold">Need a spark? ✨</h2>
        <p className="mt-0.5 text-sm text-black/50 dark:text-white/50">
          Ideas neighbors started — tap one to begin from it.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {(intent
            ? EXAMPLES.filter((ex) => ex.intent === intent)
            : EXAMPLES
          ).map((ex) => (
            <li key={ex.title}>
              <button
                type="button"
                onClick={() => setRawIdea(ex.desc)}
                className="w-full rounded-xl border border-black/5 bg-white px-4 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md dark:border-white/5 dark:bg-zinc-900"
              >
                <span className="block text-sm font-semibold">{ex.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-black/55 dark:text-white/55">
                  “{ex.desc}”
                </span>
                <span className="mt-1 block text-[11px] text-black/40 dark:text-white/40">
                  by {ex.by}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    ) : null}
    </div>
  );
}
