"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { UsersRound, Sprout, Rocket, Pencil, type LucideIcon } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_META,
  categoryMeta,
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

const CARD_LABEL_BASE =
  "flex h-full cursor-pointer flex-col gap-0.5 rounded-xl border border-black/15 px-4 py-3 text-base transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";
/** `checked` is one intent's `tint.checked` — so a radio card lights up in
    the colour of what you're building, not always emerald. */
function cardLabelClass(checked: string): string {
  return `${CARD_LABEL_BASE} ${checked}`;
}

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
  /** The tags this kind of thing actually comes in — shown on The basics
      instead of the full master list. All are real `category` slugs. */
  categories: string[];
  placeholder: string;
  /** The title, lowercased mid-sentence: "I'd like to {short}:". */
  short: string;
  /** Front and back of the flip card; headline tints step 2's heading. */
  tint: {
    front: string;
    iconBox: string;
    icon: string;
    back: string;
    headline: string;
    solid: string;
    ring: string;
    checked: string;
    chip: string;
  };
  /** Shown on the card's back on hover — a real-sounding post of this kind. */
  example: { title: string; desc: string; by: string; photo: string };
  /** Quick picks on "Your idea" — tapping one drafts the words for you.
      `seed` is written in the first person on purpose: it goes straight
      into the talk-it-out box, still editable, then through the AI shaper
      like anything typed by hand. `category` pre-picks the chip later.
      `example` is the card's flip side: a real-sounding post of this kind. */
  options: {
    emoji: string;
    label: string;
    hint: string;
    seed: string;
    category?: string;
    /** Completes "I'd like to …" in the summary on The basics. */
    summary: string;
    example?: { title: string; desc: string; by: string; photo: string };
  }[];
}[] = [
  {
    key: "meet",
    icon: UsersRound,
    title: "Meet people over an activity",
    short: "meet people over an activity",
    desc: "A walk, a game night, a running buddy — the point is the company.",
    category: "social",
    categories: ["games", "fitness", "outdoors", "food", "social", "arts", "other"],
    placeholder: "e.g. “I'd love a Sunday morning walking group, max 20 people…”",
    tint: {
      front: "bg-gradient-to-br from-sky-500 to-sky-700",
      iconBox: "bg-white/20",
      icon: "text-white",
      back: "bg-sky-800",
      headline: "text-sky-600 dark:text-sky-400",
      solid: "bg-sky-600 hover:bg-sky-700",
      ring: "ring-sky-500",
      checked: "has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50 dark:has-[:checked]:border-sky-500 dark:has-[:checked]:bg-sky-950/40",
      chip: "peer-checked:border-sky-600 peer-checked:bg-sky-600 peer-focus-visible:ring-sky-500/50",
    },
    example: {
      title: "Neighborhood walk",
      desc: "Start a neighborhood Sunday morning walk with a maximum of 20 people",
      by: "Jonathan Hammer",
      photo: "/faces/jonathan.webp",
    },
    options: [
      { emoji: "🎲", label: "Play games", summary: "meet people to play games", example: { title: "Thursday chess club", desc: "Six of us at the café's back table — all levels, bring a board", by: "Marcus Reed", photo: "/faces/marcus.webp" }, hint: "board games, chess, poker…", seed: "I'd like to meet neighbors for a regular game night — board games, chess, cards, whatever people bring.", category: "games" },
      { emoji: "🧘", label: "Exercise outdoors", summary: "meet people to exercise outdoors", example: { title: "Sunrise tai chi", desc: "Twenty easy minutes in the park before work, beginners welcome", by: "Mei Chen", photo: "/faces/mei.webp" }, hint: "walk, tai chi, yoga…", seed: "I'd like to exercise outdoors with neighbors — a walking group, tai chi, or yoga in the park, easy pace, everyone welcome.", category: "fitness" },
      { emoji: "🎬", label: "Go out together", summary: "meet people to go out together", example: { title: "Movie night crew", desc: "Tuesday discount screenings — and the dinner debate after", by: "Dana Whitfield", photo: "/faces/dana.webp" }, hint: "movie, concert, game…", seed: "I'd like company for going out — a movie, a concert, or watching a game together instead of going alone.", category: "social" },
      { emoji: "🍲", label: "Cook or eat together", summary: "meet people to cook and eat together", example: { title: "Sunday dinner rotation", desc: "Four houses take turns hosting one big table a month", by: "Sam Novak", photo: "/faces/sam.webp" }, hint: "potluck, dinner club…", seed: "I'd like to share meals with neighbors — a potluck or a small dinner club that rotates between houses.", category: "food" },
      { emoji: "☕", label: "Coffee & conversation", summary: "meet people for coffee and conversation", example: { title: "Saturday coffee corner", desc: "Same café, 9am, no agenda — whoever shows up, shows up", by: "Elena Petrova", photo: "/faces/elena.webp" }, hint: "a standing chat…", seed: "I'd like a standing coffee meetup — same café, same morning each week, whoever shows up.", category: "social" },
      { emoji: "🐕", label: "Walking buddies", summary: "find walking buddies", example: { title: "Morning loop", desc: "3 km around the reservoir before work — dogs and strollers welcome", by: "Jonathan Hammer", photo: "/faces/jonathan.webp" }, hint: "dogs, kids, or just you…", seed: "I'd like a walking buddy — with dogs, with strollers, or just for the company on a regular loop.", category: "outdoors" },
    ],
  },
  {
    key: "community",
    icon: Sprout,
    title: "Start an idea for and with a community",
    short: "start an idea for and with a community",
    desc: "A garden, a mural, a pantry — something the neighborhood builds and keeps.",
    category: "community",
    categories: ["community", "outdoors", "arts", "learning", "giving", "events", "other"],
    placeholder: "e.g. “the empty lot near the bakery could be a garden…”",
    tint: {
      front: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      iconBox: "bg-white/20",
      icon: "text-white",
      back: "bg-emerald-800",
      headline: "text-emerald-600 dark:text-emerald-400",
      solid: "bg-emerald-600 hover:bg-emerald-700",
      ring: "ring-emerald-500",
      checked: "has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40",
      chip: "peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-focus-visible:ring-emerald-500/50",
    },
    example: {
      title: "Community garden",
      desc: "Turn the empty lot on 6th into raised beds we plant together",
      by: "Rosa Alvarez",
      photo: "/faces/rosa.webp",
    },
    options: [
      { emoji: "🌱", label: "Green the block", summary: "start an idea to green the block", example: { title: "Community garden", desc: "Turn the empty lot on 6th into raised beds we plant together", by: "Rosa Alvarez", photo: "/faces/rosa.webp" }, hint: "garden, planting, cleanup…", seed: "I have an idea for greening our neighborhood — a shared garden, planting, or a regular cleanup of a spot we all pass.", category: "community" },
      { emoji: "🛠", label: "Fix & share things", summary: "start an idea to fix and share things", example: { title: "Repair café", desc: "One Saturday a month we fix broken toasters, hems and bikes", by: "Miguel Torres", photo: "/faces/miguel.webp" }, hint: "repair café, tool library…", seed: "I'd like to start a fixing or sharing setup — a repair café or a tool library so we stop buying what we could borrow.", category: "community" },
      { emoji: "🎨", label: "Make it beautiful", summary: "start an idea to make the neighborhood beautiful", example: { title: "Street mural", desc: "Paint the gray underpass with a design the kids help choose", by: "Lily Zhang", photo: "/faces/lily.webp" }, hint: "mural, benches, lights…", seed: "I have an idea to make our neighborhood more beautiful — a mural, benches, or lighting for a gray corner that deserves better.", category: "arts" },
      { emoji: "📚", label: "Share skills", summary: "start an idea to share skills", example: { title: "Senior tech hour", desc: "Help older neighbors video-call their grandkids, one hour a week", by: "Ruth Kaplan", photo: "/faces/ruth.webp" }, hint: "classes, tutoring, tech help…", seed: "I'd like neighbors to teach each other — language practice, homework help, or tech hours for anyone stuck.", category: "learning" },
      { emoji: "🥫", label: "Food & giving", summary: "start an idea around food and giving", example: { title: "Little free pantry", desc: "A weatherproof box on my fence anyone can give to or take from", by: "Hannah Brooks", photo: "/faces/hannah.webp" }, hint: "pantry, food drive…", seed: "I have an idea around food and giving — a little free pantry or a recurring food drive the block runs together.", category: "giving" },
      { emoji: "🎉", label: "A neighborhood event", summary: "start a neighborhood event", example: { title: "Block potluck", desc: "A first-Friday potluck where every house brings one dish", by: "Sam Novak", photo: "/faces/sam.webp" }, hint: "block party, market…", seed: "I'd like to organize a neighborhood event — a block party, a street market, or a first-Friday gathering.", category: "events" },
    ],
  },
  {
    key: "personal",
    icon: Rocket,
    title: "Ask for help for a personal project",
    short: "ask for help for a personal project",
    desc: "Your own build, venture, or goal — and the hands or company to move it.",
    category: "venture",
    categories: ["venture", "home", "arts", "fitness", "learning", "food", "other"],
    placeholder: "e.g. “I'm starting a tiny bakery and could use a hand on Saturdays…”",
    tint: {
      front: "bg-gradient-to-br from-violet-500 to-violet-700",
      iconBox: "bg-white/20",
      icon: "text-white",
      back: "bg-violet-800",
      headline: "text-violet-600 dark:text-violet-400",
      solid: "bg-violet-600 hover:bg-violet-700",
      ring: "ring-violet-500",
      checked: "has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 dark:has-[:checked]:border-violet-500 dark:has-[:checked]:bg-violet-950/40",
      chip: "peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-violet-500/50",
    },
    example: {
      title: "Tiny bakery test",
      desc: "I bake twenty loaves every Saturday — help me try selling them at the market",
      by: "Anna Kowalski",
      photo: "/faces/anna.webp",
    },
    options: [
      { emoji: "🔨", label: "Build something", summary: "ask for help to build something", example: { title: "Backyard sauna build", desc: "Framing a small sauna this fall — pizza for a hand with the build", by: "Leo Virtanen", photo: "/faces/leo.webp" }, hint: "shed, sauna, treehouse…", seed: "I'm building something at my place and could use a hand — I'll trade food, tools, or a lesson in what I'm doing.", category: "home" },
      { emoji: "🚀", label: "Test a venture", summary: "ask for help to test a venture", example: { title: "Tiny bakery test", desc: "I bake twenty loaves every Saturday — help me sell them at the market", by: "Anna Kowalski", photo: "/faces/anna.webp" }, hint: "bakery, stall, service…", seed: "I'm testing a small venture — help me try it for real, from a market stall to first customers.", category: "venture" },
      { emoji: "🏃", label: "Chase a goal", summary: "ask for help to chase a goal", example: { title: "First 10K", desc: "Training for my first 10K and need someone to keep me honest", by: "Grace Adeyemi", photo: "/faces/grace.webp" }, hint: "10K, language, habit…", seed: "I'm chasing a personal goal and want someone to keep me honest — training, practice, or a weekly check-in.", category: "fitness" },
      { emoji: "🎨", label: "Make a thing", summary: "ask for help to make a thing", example: { title: "Board-game prototype", desc: "I designed a card game and need honest playtesters monthly", by: "Tom Becker", photo: "/faces/tom.webp" }, hint: "game, album, book…", seed: "I'm making something — a game, music, writing — and need honest testers or feedback from real people.", category: "arts" },
      { emoji: "🧑‍🏫", label: "Learn from someone", summary: "learn a skill from a neighbor", example: { title: "Welding crash course", desc: "I'll fix your bikes all year if you teach me to weld", by: "Ken Osei", photo: "/faces/ken.webp" }, hint: "a skill I'm missing…", seed: "I'm trying to learn something for my project and would love a neighbor who knows it to show me the ropes.", category: "learning" },
      { emoji: "📦", label: "Something else", summary: "", hint: "it's my thing — hear me out…", seed: "" },
    ],
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
  const activeIntent = INTENTS.find((it) => it.key === intent) ?? null;
  /** Before a type is picked (step 1, nothing chosen yet) the wizard has no
      colour to borrow, so it stays neutral rather than defaulting to
      emerald — emerald is the community intent's colour, not the brand's. */
  const accent = activeIntent?.tint ?? {
    solid: "bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500",
    ring: "ring-zinc-500",
    checked: "has-[:checked]:border-zinc-600 has-[:checked]:bg-zinc-100 dark:has-[:checked]:border-zinc-400 dark:has-[:checked]:bg-zinc-800",
    chip: "peer-checked:border-zinc-700 peer-checked:bg-zinc-700 peer-focus-visible:ring-zinc-500/50",
    headline: "text-zinc-700 dark:text-zinc-300",
  };

  // --- Step 1: talk it out ---
  const [rawIdea, setRawIdea] = useState("");
  const [listening, setListening] = useState(false);
  const micSupported = useMicSupported();
  const [shaping, setShaping] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(playbook?.tip ?? null);
  /** Set when someone tries to move on without choosing or writing anything. */
  const [needIdea, setNeedIdea] = useState(false);
  /** The quick pick, kept so later steps can say what you chose. Dropped once
      the words no longer resemble it — a stale summary is worse than none. */
  const [picked, setPicked] = useState<{ seed: string; summary: string } | null>(
    null,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement | null>(null);

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

  /** Straight to the draft without the assistant, carrying your words with
      you: the first line becomes the title, the rest the description. Never
      overwrites text that's already there (AI-shaped or from a playbook). */
  function skipShaping() {
    const raw = rawIdea.trim();
    // Nothing chosen and nothing written: there is no idea to carry forward,
    // so say so here rather than landing on an empty draft.
    if (!raw) {
      setNeedIdea(true);
      ideaRef.current?.focus();
      return;
    }
    // Your words become the description, never the title: a spoken sentence
    // makes a poor headline, and the summary on the next step says the gist.
    if (!description.trim()) setDescription(raw);
    setAiError(null);
    setStep(2);
  }

  /** "I'd like to meet people to play games." — what steps 1 and 2 add up
      to, so The basics doesn't have to ask it again. */
  const summary = picked?.summary ?? activeIntent?.short ?? null;

  /** No title field any more: the post is titled by its own first sentence,
      which is what people write naturally anyway. The assistant's title wins
      when it produced one; the summary is the last resort. */
  const effectiveTitle = (() => {
    const explicit = title.trim();
    if (explicit) return explicit.slice(0, 140);
    const body = description.trim();
    if (body) {
      // Sentence end, line break, or a dash aside — "I'd like a game night
      // — board games, chess, cards" should title itself with the first half.
      const first = body.split(/(?<=[.!?])\s|\n| — /)[0].trim();
      return first.length > 140 ? `${first.slice(0, 137)}…` : first;
    }
    if (summary) {
      const sentence = `I'd like to ${summary}`;
      return sentence.slice(0, 140);
    }
    return "";
  })();

  const canContinueFromBasics = effectiveTitle.length > 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-start lg:gap-10">
    <div className="flex flex-col gap-6">
      {/* Progress. On desktop this lives in the right rail (below); here it
          stays horizontal for narrow screens that have no rail. */}
      <ol className="flex items-center gap-2 lg:hidden" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-2">
            <span
              className={`h-1.5 rounded-full transition-colors ${
                i <= step
                  ? accent.solid.split(" ")[0]
                  : "bg-black/10 dark:bg-white/15"
              }`}
            />
            <span
              className={`flex items-center gap-1.5 text-base font-bold ${
                i === step
                  ? accent.headline
                  : "text-black/45 dark:text-white/45"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition-colors ${
                  i <= step
                    ? accent.solid.split(" ")[0]
                    : "bg-black/10 !text-black/50 dark:bg-white/15 dark:!text-white/50"
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
          <p className="text-2xl font-extrabold">I&rsquo;d like to:</p>
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

      {/* ---- Step 2: your idea — quick picks first, own words below ---- */}
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div>
            {activeIntent ? (
              <p className="text-2xl font-extrabold">
                I&rsquo;d like to{" "}
                <span className={activeIntent.tint.headline}>
                  {activeIntent.short}
                </span>
                :
              </p>
            ) : (
              <p className="text-2xl font-extrabold">💬 Just talk it out</p>
            )}
            {activeIntent ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeIntent.options.map((o) => {
                  const isPicked = o.seed !== "" && picked?.seed === o.seed;
                  return (
                    /* Same flip grammar as the intent cards: colored front,
                       hover turns it over to the exact words a tap drafts. */
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => {
                        setRawIdea(o.seed);
                        setPicked(o.summary ? { seed: o.seed, summary: o.summary } : null);
                        if (o.category) setCategory(o.category);
                        setNeedIdea(false);
                        if (!o.seed) ideaRef.current?.focus();
                      }}
                      className={`group relative h-28 text-left [perspective:800px] ${
                        isPicked ? `rounded-xl ring-2 ring-offset-2 ${activeIntent.tint.ring}` : ""
                      }`}
                    >
                      <span className="relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]">
                        {/* Front */}
                        <span
                          className={`absolute inset-0 flex flex-col rounded-xl p-3 text-white shadow-md [backface-visibility:hidden] ${activeIntent.tint.front}`}
                        >
                          <span className="block text-xl leading-none" aria-hidden>
                            {o.emoji}
                          </span>
                          <span className="mt-1.5 block text-sm font-bold leading-snug">
                            {o.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-white/80">
                            {o.hint}
                          </span>
                        </span>
                        {/* Back: a real-sounding post of this kind */}
                        <span
                          className={`absolute inset-0 flex flex-col rounded-xl p-3 text-white shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] ${activeIntent.tint.back}`}
                        >
                          {o.example ? (
                            <>
                              <span className="text-[13px] font-bold leading-snug">
                                {o.example.title}
                              </span>
                              <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/85">
                                “{o.example.desc}”
                              </span>
                              <span className="mt-auto flex items-center gap-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset */}
                                <img
                                  src={o.example.photo}
                                  alt=""
                                  className="h-6 w-6 shrink-0 rounded-full border border-white/60 object-cover"
                                />
                                <span className="truncate text-[11px] font-medium text-white/90">
                                  {o.example.by}
                                </span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] leading-snug text-white/90">
                                Your words, your way — tap and start typing
                                below.
                              </span>
                              <span className="mt-auto text-[10px] font-semibold uppercase tracking-wide text-white/70">
                                Tap to write your own →
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <p className="mt-4 text-base font-semibold">
              …or you have something else in mind:
            </p>
            <textarea
              ref={ideaRef}
              value={rawIdea}
              onChange={(e) => {
                const next = e.target.value;
                setRawIdea(next);
                if (next.trim()) setNeedIdea(false);
                if (picked && !next.startsWith(picked.seed.slice(0, 15))) {
                  setPicked(null);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder={
                activeIntent?.placeholder ??
                "e.g. “the empty lot near the bakery could be a garden…”"
              }
              className={`${inputClass} mt-1.5 w-full resize-y bg-white dark:bg-black/20`}
            />

            <div className="relative mt-3 flex flex-wrap items-center gap-2">
              {needIdea ? (
                <p
                  role="alert"
                  className="absolute -top-3 left-0 -translate-y-full rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                >
                  Pick one above, or tell us in your own words what you&rsquo;d
                  like to do.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-full border border-black/15 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                ← Back
              </button>
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
                className={`rounded-full px-6 py-3 text-base font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${accent.solid}`}
              >
                {shaping ? "Shaping…" : "✨ Shape my idea"}
              </button>
              {/* Skipping the assistant is a first-class path, not a fallback
                  for when it breaks — so whatever you typed comes with you
                  into the draft rather than being dropped on the floor. */}
              <button
                type="button"
                onClick={skipShaping}
                className="rounded-full border border-black/15 px-6 py-3 text-base font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Next →
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

        </div>
      ) : null}

      {/* ---- Step 3: the basics ---- */}
      {step === 2 ? (
        <div className="flex flex-col gap-6">
          {/* What steps 1 and 2 added up to. Stated once, in the intent's own
              colour, so the form below can get on with the details. */}
          {summary ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
                Summary
              </p>
              <p
                className={`mt-0.5 flex flex-wrap items-center gap-2 text-xl font-extrabold ${accent.headline}`}
              >
                I&rsquo;d like to {summary}.
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  title="Change what you'd like to do"
                  className="rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black/70 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/70"
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                  <span className="sr-only">Edit</span>
                </button>
              </p>
            </div>
          ) : null}

          {tip ? (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              💡 {tip}
            </p>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-base font-bold">
              Small description{" "}
              <span className="font-normal text-black/40 dark:text-white/40">
                (optional)
              </span>
            </span>
            <textarea
              rows={2}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the plan? What help do you need?"
              className={`${inputClass} resize-y`}
            />
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-base font-bold">
              Cover photo{" "}
              <span className="font-normal text-black/40 dark:text-white/40">
                (optional)
              </span>
            </legend>
            <PhotoPicker
              userId={userId}
              value={photoUrl}
              onChange={setPhotoUrl}
              compact
              label="Upload or drag a photo here"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-base font-bold">What kind of project is it?</legend>
            <div className="flex flex-wrap gap-2">
              {(activeIntent?.categories ?? [...CATEGORIES]).map((c) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    checked={category === c}
                    onChange={() => setCategory(c)}
                    className="peer sr-only"
                  />
                  <span
                    className={`inline-block rounded-full border border-black/15 px-3.5 py-1.5 transition-colors peer-checked:text-white peer-focus-visible:ring-2 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10 ${accent.chip}`}
                  >
                    {categoryMeta(c).emoji} {categoryMeta(c).label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 text-base font-bold">Where are you at?</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className={`flex-1 ${cardLabelClass(accent.checked)}`}>
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
              <label className={`flex-1 ${cardLabelClass(accent.checked)}`}>
                <input
                  type="radio"
                  checked={state === "active"}
                  onChange={() => setState("active")}
                  className="sr-only"
                />
                <span className="font-medium">🚀 Already started</span>
                <span className="text-xs text-black/50 dark:text-white/50">
                  Under way — more hands welcome
                </span>
              </label>
            </div>
          </fieldset>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-black/15 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!canContinueFromBasics}
              className={`rounded-full px-7 py-3 text-base font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${accent.solid}`}
            >
              Continue →
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
                <label key={h} className={`flex-1 ${cardLabelClass(accent.checked)}`}>
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
                <label key={r} className={`flex-1 ${cardLabelClass(accent.checked)}`}>
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
              onClick={() => setStep(2)}
              className="rounded-full border border-black/15 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`rounded-full px-7 py-3 text-base font-medium text-white transition-colors ${accent.solid}`}
            >
              Continue →
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
              {effectiveTitle}
            </p>
            {description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">
                {description}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/50 dark:text-white/50">
              <span>{state === "active" ? "🚀 Already started" : "💭 Just an idea"}</span>
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
            <input type="hidden" name="title" value={effectiveTitle} />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="help" value={help} />
            <input type="hidden" name="reach" value={reach} />
            <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
            <input type="hidden" name="lat" value={loc?.lat ?? ""} />
            <input type="hidden" name="lng" value={loc?.lng ?? ""} />
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-full border border-black/15 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              type="submit"
              className={`rounded-full px-7 py-3 text-base font-medium text-white transition-colors ${accent.solid}`}
            >
              Share it 🎉
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

    {/* Right rail: where you are in the flow, then (on the talk-it-out step)
        a few real ideas to start from. The stepper reads vertically here —
        five labels across a 30rem column would wrap into mush. */}
    <aside className="hidden lg:block">
      <ol className="mb-8 flex flex-col gap-1" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition-colors ${
                i <= step
                  ? accent.solid.split(" ")[0]
                  : "bg-black/10 !text-black/50 dark:bg-white/15 dark:!text-white/50"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-base font-bold ${
                i === step
                  ? accent.headline
                  : "text-black/45 dark:text-white/45"
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <>
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
        </>
      ) : null}
    </aside>
    </div>
  );
}
