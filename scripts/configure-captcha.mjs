#!/usr/bin/env node
/**
 * configure-captcha.mjs — enables Cloudflare Turnstile CAPTCHA on Supabase
 * auth (sign-up, sign-in, magic link).
 *
 * Setup (once):
 *   1. Create a free Turnstile widget at https://dash.cloudflare.com →
 *      Turnstile → Add site (domain: peoplearound-webapp.vercel.app, plus
 *      localhost for dev). Mode: Managed.
 *   2. Put both keys in .env.local:
 *        NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
 *        TURNSTILE_SECRET_KEY=0x...
 *      (also add NEXT_PUBLIC_TURNSTILE_SITE_KEY to Vercel envs)
 *   3. Run: node scripts/configure-captcha.mjs
 *
 * The login form renders the widget only when the site key env var exists,
 * so the app works with or without this being enabled.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function envLocal(key) {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
  const line = text.split("\n").find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "") : undefined;
}

const token = process.env.SUPABASE_ACCESS_TOKEN || envLocal("SUPABASE_ACCESS_TOKEN");
const ref = process.env.SUPABASE_PROJECT_REF || envLocal("SUPABASE_PROJECT_REF");
const secret = process.env.TURNSTILE_SECRET_KEY || envLocal("TURNSTILE_SECRET_KEY");
if (!token || !ref) {
  console.error("✗ Need SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in .env.local");
  process.exit(1);
}
if (!secret) {
  console.error(
    "✗ TURNSTILE_SECRET_KEY missing from .env.local — create a widget at",
    "https://dash.cloudflare.com → Turnstile, then add both keys and re-run.",
  );
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    security_captcha_enabled: true,
    security_captcha_provider: "turnstile",
    security_captcha_secret: secret,
  }),
});
if (!res.ok) {
  console.error(`✗ HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  process.exit(1);
}
console.log("✅ Turnstile CAPTCHA enabled on Supabase auth (sign-up, sign-in, magic link)");
