"use client";

import { useState } from "react";
import { Flyer } from "@/components/Flyer";
import { SubmitButton } from "@/components/SubmitButton";
import { CopyButton } from "@/components/CopyButton";
import { COPY_LIMITS, type FlyerCopy } from "@/lib/flyer-copy";
import {
  FLYER_STYLES,
  FLYER_STYLE_KEYS,
  type FlyerStyleKey,
} from "@/lib/flyer-styles";
import { generateFlyer, saveFlyer, setProjectSharing } from "./flyerActions";

/**
 * The studio's controls beside a live preview of the sheet.
 *
 * Three steps, in the order they have to happen: the page the code opens
 * (publish), the words (ask the assistant, then edit), the paper (print).
 * The preview redraws on every keystroke; nothing is kept until Save.
 */

const CARD =
  "rounded-2xl border border-slate-300 p-5 dark:border-slate-600";
const INPUT =
  "mt-1 w-full rounded-xl border border-slate-400 bg-transparent p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-400";
const PRIMARY =
  "rounded-lg bg-pa-brand px-5 py-2 text-sm font-medium text-pa-brand-ink transition-colors hover:bg-pa-brand-hover";
const SECONDARY =
  "rounded-lg border border-slate-400 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10";

type Props = {
  projectId: string;
  hasFlyer: boolean;
  /** Who wrote the current words: a model, or null when the steward did. */
  model: string | null;
  initialCopy: FlyerCopy;
  initialStyle: FlyerStyleKey;
  hint: string;
  /** The page the code opens; null until published. */
  url: string | null;
  shareCode: string | null;
  /** The code in every look, or null until published. */
  qr: Record<FlyerStyleKey, string> | null;
  sheet: {
    eyebrow: string;
    kind: string;
    nextUp: { title: string; when: string; place: string | null } | null;
    team: number;
    photoUrl: string | null;
  };
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-full bg-pa-brand text-[11px] font-bold text-pa-brand-ink"
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function FlyerStudio(props: Props) {
  const [copy, setCopy] = useState<FlyerCopy>(props.initialCopy);
  const [style, setStyle] = useState<FlyerStyleKey>(props.initialStyle);

  const bullets = [0, 1, 2].map((i) => props.initialCopy.bullets[i] ?? "");
  const [bulletFields, setBulletFields] = useState<string[]>(bullets);

  const field =
    (key: keyof Omit<FlyerCopy, "bullets">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCopy((c) => ({ ...c, [key]: e.target.value }));

  const preview: FlyerCopy = {
    ...copy,
    bullets: bulletFields.map((b) => b.trim()).filter(Boolean),
  };
  const qrSvg = props.qr ? props.qr[style] : null;

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-2 print:block">
      <div className="flex flex-col gap-4 print:hidden">
        <Step n={1} title="The page the code opens">
          {props.url ? (
            <>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Published. Anyone who scans the code lands here — what, where,
                how many are in, and a way to join. Never who.
              </p>
              <p className="mt-2 break-all rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-zinc-900">
                {props.url}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CopyButton text={props.url} label="Copy link" className={SECONDARY} />
                <a href={props.url} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                  Open the page ↗
                </a>
                <a href={`/p/${props.shareCode}/qr?download=1`} className={SECONDARY}>
                  Download the code (SVG)
                </a>
              </div>
              <form action={setProjectSharing} className="mt-3">
                <input type="hidden" name="projectId" value={props.projectId} />
                <input type="hidden" name="on" value="0" />
                <SubmitButton
                  pendingLabel="Unpublishing…"
                  className="text-xs text-black/45 underline underline-offset-2 hover:text-black dark:text-white/45 dark:hover:text-white"
                >
                  Unpublish — anything already printed stops working
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                A flyer needs somewhere to send people. Publishing gives this
                project a page anyone can open without an account, and the
                code on the flyer points there. It shows what, where and how
                many are in — never who.
              </p>
              <form action={setProjectSharing} className="mt-3">
                <input type="hidden" name="projectId" value={props.projectId} />
                <input type="hidden" name="on" value="1" />
                <SubmitButton pendingLabel="Publishing…" className={PRIMARY}>
                  Publish &amp; get a code
                </SubmitButton>
              </form>
            </>
          )}
        </Step>

        <Step n={2} title="The words">
          <form action={generateFlyer} className="mt-2">
            <input type="hidden" name="projectId" value={props.projectId} />
            <input type="hidden" name="style" value={style} />
            <label className="block text-xs text-black/60 dark:text-white/60">
              Anything the assistant should know? Optional.
              <input
                name="hint"
                defaultValue={props.hint}
                maxLength={300}
                placeholder='e.g. "we need someone with a truck", "keep it playful", "in Spanish"'
                className={INPUT}
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <SubmitButton
                pendingLabel="Writing…"
                className={props.hasFlyer ? SECONDARY : PRIMARY}
              >
                {props.hasFlyer ? "Write it again" : "Write it with the assistant"}
              </SubmitButton>
              <span className="text-xs text-black/45 dark:text-white/45">
                {props.model
                  ? "Drafted by the assistant — edit anything below."
                  : props.hasFlyer
                    ? "Your own words."
                    : "Uses only what the project already says. Nothing is invented."}
              </span>
            </div>
          </form>

          <form action={saveFlyer} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="projectId" value={props.projectId} />

            <label className="block text-xs text-black/60 dark:text-white/60">
              Headline
              <input
                name="headline"
                required
                value={copy.headline}
                onChange={field("headline")}
                maxLength={COPY_LIMITS.headline}
                className={`${INPUT} text-base font-semibold`}
              />
            </label>
            <label className="block text-xs text-black/60 dark:text-white/60">
              One line under it
              <input
                name="subline"
                value={copy.subline}
                onChange={field("subline")}
                maxLength={COPY_LIMITS.subline}
                className={INPUT}
              />
            </label>
            <label className="block text-xs text-black/60 dark:text-white/60">
              A few sentences
              <textarea
                name="body"
                value={copy.body}
                onChange={field("body")}
                maxLength={COPY_LIMITS.body}
                rows={3}
                className={INPUT}
              />
            </label>
            <fieldset>
              <legend className="text-xs text-black/60 dark:text-white/60">
                Three short lines — asks, what to bring, what helpers get
              </legend>
              {bulletFields.map((b, i) => (
                <input
                  key={i}
                  name={`bullet${i + 1}`}
                  value={b}
                  onChange={(e) =>
                    setBulletFields((all) => all.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  maxLength={COPY_LIMITS.bullet}
                  aria-label={`Line ${i + 1}`}
                  className={INPUT}
                />
              ))}
            </fieldset>
            <label className="block text-xs text-black/60 dark:text-white/60">
              Next to the code
              <input
                name="cta"
                value={copy.cta}
                onChange={field("cta")}
                maxLength={COPY_LIMITS.cta}
                className={INPUT}
              />
            </label>

            <fieldset>
              <legend className="text-xs text-black/60 dark:text-white/60">The look</legend>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FLYER_STYLE_KEYS.map((k) => {
                  const s = FLYER_STYLES[k];
                  const on = k === style;
                  return (
                    <label
                      key={k}
                      className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2 text-xs transition-colors ${
                        on
                          ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
                          : "border-slate-400 hover:bg-black/5 dark:border-slate-400 dark:hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="style"
                        value={k}
                        checked={on}
                        onChange={() => setStyle(k)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className="h-6 w-full rounded-md ring-1 ring-black/10"
                        style={{
                          background: `linear-gradient(90deg, ${s.accent} 0 45%, ${s.paper} 45% 100%)`,
                        }}
                      />
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[11px] leading-tight text-black/50 dark:text-white/50">
                        {s.hint}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <SubmitButton pendingLabel="Saving…" className={PRIMARY}>
                Save the flyer
              </SubmitButton>
            </div>
          </form>
        </Step>

        <Step n={3} title="Paper">
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Prints on one sheet of A4. If it is going through a photocopier,
            pick the Ink look first — colour is the first thing a copier loses.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.print()} className={PRIMARY}>
              Print this flyer
            </button>
            <span className="text-xs text-black/45 dark:text-white/45">
              Save as PDF from the print dialog to send it to a print shop.
            </span>
          </div>
        </Step>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45 print:hidden dark:text-white/45">
          Preview
        </p>
        <div className="flyer-sheet mx-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-300 shadow-md dark:border-slate-600 lg:sticky lg:top-6">
          <Flyer
            copy={preview}
            style={style}
            eyebrow={props.sheet.eyebrow}
            kind={props.sheet.kind}
            nextUp={props.sheet.nextUp}
            team={props.sheet.team}
            url={props.url}
            qrSvg={qrSvg}
            photoUrl={props.sheet.photoUrl}
          />
        </div>
      </div>
    </div>
  );
}
