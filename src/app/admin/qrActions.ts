"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdministrator } from "@/lib/admin";

/**
 * Where a printed QR code points (migration 0073). Admin only, re-verified
 * on every call by requireAdministrator().
 */

const SLUG = /^[a-z0-9][a-z0-9-]{0,30}$/i;

/**
 * http(s) only — a printed code must never become a `javascript:` or `data:`
 * payload, and the table's own constraint says the same. A bare
 * "venmo.com/u/elle", which is what people paste, is read as https.
 */
function webUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function saveQrCode(form: FormData) {
  const { admin, user } = await requireAdministrator();

  const slug = String(form.get("slug") ?? "").trim();
  if (!SLUG.test(slug)) {
    redirect("/admin?error=A+code+is+letters,+numbers+and+dashes");
  }

  const typed = String(form.get("url") ?? "").trim();
  const url = typed ? webUrl(typed) : null;
  if (typed && !url) {
    redirect("/admin?error=That+destination+is+not+a+web+address");
  }

  const label = String(form.get("label") ?? "").trim().slice(0, 80) || null;

  const { error } = await admin.from("qr_codes").upsert(
    {
      slug,
      url,
      label,
      enabled: form.get("enabled") === "on",
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "slug" },
  );
  if (error) redirect("/admin?error=Could+not+save+that+code");

  revalidatePath("/admin");
  redirect(
    `/admin?message=${encodeURIComponent(
      url
        ? `/qr/${slug} now goes to ${url}`
        : `/qr/${slug} has no destination — scans land on the front door`,
    )}`,
  );
}
