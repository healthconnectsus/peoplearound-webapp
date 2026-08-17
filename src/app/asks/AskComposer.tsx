"use client";

import { useRef, useState } from "react";
import {
  X,
  Sofa,
  Wrench,
  Car,
  Dog,
  FileText,
  Package,
  type LucideIcon,
} from "lucide-react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { MapPicker } from "@/components/MapPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { postAsk } from "./askActions";

/**
 * Asking for a hand, as a wizard — the same shape as the idea wizard, in
 * amber rather than the intent colours, because it is the same kind of act:
 * turning a half-formed thought into something a neighbor can say yes to.
 *
 * The steps exist for one reason. What decides whether an ask gets answered
 * is whether a neighbor can picture it — *what*, for *how long*, *when* and
 * roughly *where*. A single long form asks all four at once and gets vague
 * answers to all four; one question at a time gets specific ones.
 *
 * It stays short on purpose: four steps, nothing required past the first.
 * Someone who needs twenty minutes of help will not complete a ten-field
 * form, and shouldn't have to.
 */

const STEPS = ["What you need", "How long", "When & where", "Post it"] as const;

/** Common favors as flip cards; the back is the ask, written out. */
const KINDS: {
  icon: LucideIcon;
  label: string;
  hint: string;
  seed: string;
  minutes: number;
}[] = [
  {
    icon: Sofa,
    label: "Move something heavy",
    hint: "sofa, mattress, wardrobe…",
    seed: "Move a sofa into the living room",
    minutes: 30,
  },
  {
    icon: Wrench,
    label: "A second pair of hands",
    hint: "hold a ladder, steady a shelf…",
    seed: "Hold a ladder while I clear the gutter",
    minutes: 20,
  },
  {
    icon: Car,
    label: "Something with a car",
    hint: "jump-start, a lift, a pickup…",
    seed: "Jump-start my car",
    minutes: 20,
  },
  {
    icon: Dog,
    label: "Watch something for a bit",
    hint: "a dog, a delivery, a plant…",
    seed: "Watch the dog for an hour",
    minutes: 60,
  },
  {
    icon: FileText,
    label: "Help me understand something",
    hint: "a letter, a form, a phone…",
    seed: "Read a letter I don't understand",
    minutes: 20,
  },
  {
    icon: Package,
    label: "Something else",
    hint: "tell me in your own words",
    seed: "",
    minutes: 30,
  },
];

const MINUTES = [
  { value: 10, label: "10 min", hint: "A doorstep favor." },
  { value: 20, label: "20 min", hint: "Long enough to be useful." },
  { value: 30, label: "30 min", hint: "The most common ask." },
  { value: 60, label: "1 hour", hint: "A real errand." },
  { value: 120, label: "2 hours", hint: "An afternoon's corner." },
  { value: 240, label: "Half a day", hint: "Worth feeding someone for." },
];

function minutesLabel(m: number) {
  return MINUTES.find((x) => x.value === m)?.label ?? `${m} min`;
}

export function AskComposer({
  userId,
  startOpen = false,
  center = null,
}: {
  userId: string;
  /** The sidebar's "Ask for small help" lands here with the form already up. */
  startOpen?: boolean;
  /** Opens the pin map on your neighborhood rather than the whole planet. */
  center?: { lat: number; lng: number } | null;
}) {
  const [open, setOpen] = useState(startOpen);
  // useState(startOpen) only reads the prop on the very first mount. When
  // you're already on /people and click "Ask for small help" again, Next.js
  // re-renders this same component instance with a fresh startOpen=true
  // instead of remounting it, so the stale `open` state never catches up and
  // the click appears to do nothing. Adjusted during render (React's
  // documented pattern), tracking the last-seen prop so it fires once.
  const [prevStartOpen, setPrevStartOpen] = useState(startOpen);
  if (startOpen !== prevStartOpen) {
    setPrevStartOpen(startOpen);
    if (startOpen) setOpen(true);
  }

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [whenText, setWhenText] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setOpen(false);
    setStep(0);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-amber-500/50 bg-amber-50/60 px-5 py-4 text-left transition-colors hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
      >
        <span className="text-base font-semibold">🙋 Ask for a hand</span>
        <span className="mt-0.5 block text-sm text-black/55 dark:text-white/55">
          Twenty minutes of someone&rsquo;s time is not a big favor. Ask.
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950">
      <button
        type="button"
        aria-label="Close"
        onClick={reset}
        className="fixed left-3 top-3 z-10 rounded-full p-3 text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-12 w-12" strokeWidth={2} aria-hidden />
      </button>

      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 lg:px-10">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight lg:pl-14">
          Ask for small help 🙋
        </h1>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-10">
          <form
            action={postAsk}
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              // Only the last step submits. The Continue buttons are
              // type="button", but a stray Enter in a text field would
              // otherwise post a half-finished ask.
              if (step !== STEPS.length - 1) e.preventDefault();
            }}
          >
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="minutes" value={minutes} />
            <input type="hidden" name="whenText" value={whenText} />
            <input type="hidden" name="place" value={place} />
            <input type="hidden" name="description" value={description} />
            <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
            <input type="hidden" name="lat" value={spot?.lat ?? ""} />
            <input type="hidden" name="lng" value={spot?.lng ?? ""} />

            {/* ---- Step 1: what do you need? ---- */}
            {step === 0 ? (
              <div className="flex flex-col gap-4">
                <p className="text-2xl font-extrabold">
                  What do you need a hand with?
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {KINDS.map((k) => {
                    const Icon = k.icon;
                    return (
                      <button
                        key={k.label}
                        type="button"
                        onClick={() => {
                          setTitle(k.seed);
                          setMinutes(k.minutes);
                          setStep(1);
                          if (!k.seed) {
                            // "Something else" means they'll type it — land
                            // on the next step with the cursor waiting.
                            setTimeout(() => titleRef.current?.focus(), 50);
                          }
                        }}
                        className="group relative h-28 text-left [perspective:800px]"
                      >
                        <span className="relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]">
                          <span className="absolute inset-0 flex flex-col rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-3 text-amber-950 shadow-md [backface-visibility:hidden]">
                            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                            <span className="mt-1.5 block text-sm font-bold leading-snug">
                              {k.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-amber-950/70">
                              {k.hint}
                            </span>
                          </span>
                          <span className="absolute inset-0 flex flex-col rounded-xl bg-amber-800 p-3 text-white shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                            <span className="text-[13px] font-medium leading-snug">
                              {k.seed
                                ? `“${k.seed}”`
                                : "Your words — nobody needs a reason."}
                            </span>
                            <span className="mt-auto text-[10px] font-semibold uppercase tracking-wide text-white/70">
                              {k.seed ? "Start from this →" : "Write your own →"}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-black/45 dark:text-white/45">
                  Asking is not a favor you owe back. The neighborhoods that
                  work are the ones where small asks are ordinary.
                </p>
              </div>
            ) : null}

            {/* ---- Step 2: the ask, and how long ---- */}
            {step === 1 ? (
              <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-2xl font-extrabold">
                    What do you need?
                  </span>
                  <input
                    ref={titleRef}
                    type="text"
                    maxLength={140}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. “Move a sofa into the living room”"
                    className="rounded-xl border border-slate-400 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-amber-500 dark:border-slate-400"
                  />
                </label>

                <fieldset>
                  <legend className="text-base font-bold">
                    Roughly how long will it take?
                  </legend>
                  <p className="mb-2 mt-0.5 text-sm text-black/50 dark:text-white/50">
                    The honest number is the whole trick — people say yes to a
                    number they can picture.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MINUTES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMinutes(m.value)}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                          minutes === m.value
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
                            : "border-slate-400 hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          {m.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-black/50 dark:text-white/50">
                          {m.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="rounded-full border border-slate-400 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={!title.trim()}
                    onClick={() => setStep(2)}
                    className="rounded-full bg-amber-500 px-7 py-3 text-base font-medium text-amber-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            ) : null}

            {/* ---- Step 3: when & where ---- */}
            {step === 2 ? (
              <div className="flex flex-col gap-5">
                <p className="text-2xl font-extrabold">When and where?</p>

                <label className="flex flex-col gap-1.5">
                  <span className="text-base font-bold">
                    When{" "}
                    <span className="font-normal text-black/40 dark:text-white/40">
                      (optional)
                    </span>
                  </span>
                  <input
                    type="text"
                    maxLength={80}
                    value={whenText}
                    onChange={(e) => setWhenText(e.target.value)}
                    placeholder="e.g. “Any evening this week”"
                    className="rounded-xl border border-slate-400 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-amber-500 dark:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-base font-bold">
                    Roughly where{" "}
                    <span className="font-normal text-black/40 dark:text-white/40">
                      (optional)
                    </span>
                  </span>
                  <input
                    type="text"
                    maxLength={120}
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="e.g. “5th &amp; Oak”"
                    className="rounded-xl border border-slate-400 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-amber-500 dark:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-base font-bold">
                    Anything useful{" "}
                    <span className="font-normal text-black/40 dark:text-white/40">
                      (optional)
                    </span>
                  </span>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="How heavy, how many people, third floor no lift…"
                    className="resize-y rounded-xl border border-slate-400 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-amber-500 dark:border-slate-400"
                  />
                </label>

                <fieldset>
                  <legend className="text-base font-bold">
                    Drop a rough pin{" "}
                    <span className="font-normal text-black/40 dark:text-white/40">
                      (optional)
                    </span>
                  </legend>
                  <p className="mb-1.5 mt-0.5 text-sm text-black/50 dark:text-white/50">
                    A corner or a block, not your door — we round it to about
                    110 m.
                  </p>
                  <MapPicker value={spot} onChange={setSpot} center={center} />
                </fieldset>

                <PhotoPicker
                  userId={userId}
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  compact
                  label="Add a photo (optional)"
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-slate-400 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-full bg-amber-500 px-7 py-3 text-base font-medium text-amber-950 transition-colors hover:bg-amber-400"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            ) : null}

            {/* ---- Step 4: review & post ---- */}
            {step === 3 ? (
              <div className="flex flex-col gap-5">
                <p className="text-2xl font-extrabold">
                  Here&rsquo;s what neighbors will see
                </p>

                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900">
                  {photoUrl ? (
                    <div
                      aria-hidden
                      className="h-40 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${photoUrl})` }}
                    />
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium leading-snug">
                        <span className="mr-1.5" aria-hidden>
                          🙋
                        </span>
                        {title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                        ⏱ {minutesLabel(minutes)}
                      </span>
                    </div>
                    {description ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">
                        {description}
                      </p>
                    ) : null}
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/45 dark:text-white/45">
                      {whenText ? <span>🗓 {whenText}</span> : null}
                      {place ? <span>📍 around {place}</span> : null}
                      {spot ? <span>📍 Pinned on the map</span> : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full border border-slate-400 px-5 py-2.5 text-base font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    ← Back
                  </button>
                  <SubmitButton
                    pendingLabel="Posting…"
                    className="rounded-full bg-amber-500 px-7 py-3 text-base font-medium text-amber-950 transition-colors hover:bg-amber-400"
                  >
                    Post the ask 🙋
                  </SubmitButton>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-sm text-black/45 hover:underline dark:text-white/45"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </form>

          {/* Where you are in the flow — same right rail as the idea wizard. */}
          <aside className="hidden lg:block">
            <ol className="flex flex-col gap-1" aria-label="Steps">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      i <= step
                        ? "bg-amber-500 text-amber-950"
                        : "bg-black/10 text-black/50 dark:bg-white/15 dark:text-white/50"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-base font-bold ${
                      i === step
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-black/45 dark:text-white/45"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </div>
  );
}
