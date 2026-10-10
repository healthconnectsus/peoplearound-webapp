import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { SITE_URL } from "@/lib/site";
import { timeAgo } from "@/lib/projects";
import { saveQrCode } from "./qrActions";
import { hostedPage } from "@/app/qr/_hosted/pages";

/**
 * Printed QR codes and where they point (migration 0073).
 *
 * Rendered only after AdminPage's session/is_admin gate.
 */

const INPUT =
  "rounded-lg border border-slate-400 bg-transparent px-3 py-1.5 text-sm outline-none transition-colors focus:border-emerald-600 dark:border-slate-400";

export async function QrCodes() {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: codes } = await admin
    .from("qr_codes")
    .select("slug,url,label,enabled,scans,last_scan_at")
    .order("slug");

  return (
    <section className="mt-8 rounded-2xl border border-slate-300 p-5 dark:border-slate-600">
      <h2 className="text-lg font-bold">Printed QR codes</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        The paper can&rsquo;t be edited; this can. Each code is a link we own —
        change where it goes and the next scan lands there, with nothing to
        reprint.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {(codes ?? []).map((c) => (
          <li
            key={c.slug}
            className="rounded-xl border border-slate-300 p-4 dark:border-slate-600"
          >
            <form action={saveQrCode} className="flex flex-col gap-2">
              <input type="hidden" name="slug" value={c.slug} />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {SITE_URL}/qr/{c.slug}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {c.scans} {c.scans === 1 ? "scan" : "scans"}
                  {c.last_scan_at ? ` · last ${timeAgo(c.last_scan_at)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  name="label"
                  defaultValue={c.label ?? ""}
                  placeholder="What this code is"
                  aria-label={`What code ${c.slug} is`}
                  maxLength={80}
                  className={`${INPUT} w-44`}
                />
                <input
                  name="url"
                  defaultValue={c.url ?? ""}
                  placeholder="https://venmo.com/u/…"
                  aria-label={`Destination for code ${c.slug}`}
                  maxLength={500}
                  inputMode="url"
                  className={`${INPUT} min-w-48 flex-1`}
                />
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={c.enabled}
                    className="h-4 w-4"
                  />
                  On
                </label>
                <SubmitButton pendingLabel="Saving…" className={INPUT}>
                  Save
                </SubmitButton>
              </div>
              <p className="text-xs text-black/45 dark:text-white/45">
                {!c.enabled ? (
                  "Off — scans land on the front door."
                ) : c.url ? (
                  <>
                    Scans go to <span className="break-all">{c.url}</span>
                  </>
                ) : hostedPage(c.slug) ? (
                  "Scans open its own page, built into the site. Set a destination to send them somewhere else instead."
                ) : (
                  "Scans land on the front door — no destination set."
                )}
              </p>
            </form>
          </li>
        ))}
      </ul>

      <form action={saveQrCode} className="mt-4 flex flex-wrap items-center gap-2">
        <input
          required
          name="slug"
          placeholder="New code, e.g. 2"
          aria-label="New code"
          maxLength={30}
          className={`${INPUT} w-36`}
        />
        <input
          name="label"
          placeholder="What it is"
          aria-label="What the new code is"
          maxLength={80}
          className={`${INPUT} w-44`}
        />
        <input
          name="url"
          placeholder="https://… (can be set later)"
          aria-label="Destination for the new code"
          maxLength={500}
          inputMode="url"
          className={`${INPUT} min-w-48 flex-1`}
        />
        <input type="hidden" name="enabled" value="on" />
        <SubmitButton pendingLabel="Adding…" className={INPUT}>
          Add a code
        </SubmitButton>
      </form>
      <p className="mt-2 text-xs text-black/50 dark:text-white/50">
        Scan counts include link previews — iMessage and WhatsApp fetch a URL
        to build their cards — so read them as interest, not as people.
      </p>
    </section>
  );
}
