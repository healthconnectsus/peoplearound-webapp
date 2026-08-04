#!/usr/bin/env node
/**
 * configure-auth-email.mjs — brands Supabase auth emails.
 *
 * Sets (via the Supabase Management API):
 *   • SMTP through Resend, so auth mail is sent from the verified
 *     peoplearound.com domain instead of noreply@mail.app.supabase.io
 *   • Sleek HTML templates + subjects for confirmation and magic-link mail
 *
 * Reads SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, RESEND_API_KEY from
 * .env.local. Idempotent — safe to re-run after template tweaks.
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
const resendKey = process.env.RESEND_API_KEY || envLocal("RESEND_API_KEY");
if (!token || !ref || !resendKey) {
  console.error("✗ Need SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, RESEND_API_KEY");
  process.exit(1);
}

/** Shared shell: warm canvas, white card, gradient header, pill CTA. */
function emailHtml({ heading, body, cta, note }) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#0d9488);background-color:#059669;padding:28px 32px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">people<span style="opacity:.85;">around</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#18181b;">${heading}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;">${body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#059669;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${cta}</a>
            </td></tr></table>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#a1a1aa;">${note}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">
              Share an idea. Build it together — with the people around you.<br/>
              Sent by Peoplearound · <a href="https://peoplearound.com" style="color:#059669;text-decoration:none;">peoplearound.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const confirmation = emailHtml({
  heading: "Welcome, neighbor 👋",
  body: "You're one tap away from the people building things around you. Confirm your email and step inside.",
  cta: "Confirm my email",
  note: "If you didn't create a Peoplearound account, you can safely ignore this email — nothing happens without this confirmation.",
});

const magicLink = emailHtml({
  heading: "Your sign-in link 🔑",
  body: "Tap the button below and you're in — no password needed. This link works once and expires shortly.",
  cta: "Sign me in",
  note: "If you didn't request this link, you can safely ignore this email — your account stays secure.",
});

const payload = {
  smtp_admin_email: "hello@peoplearound.com",
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_pass: resendKey,
  smtp_sender_name: "Peoplearound",
  mailer_subjects_confirmation: "Confirm your email and meet your neighbors 🌱",
  mailer_templates_confirmation_content: confirmation,
  mailer_subjects_magic_link: "Your Peoplearound sign-in link",
  mailer_templates_magic_link_content: magicLink,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  console.error(`✗ HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  process.exit(1);
}
console.log("✅ Auth email branding applied: Resend SMTP (hello@peoplearound.com) + confirmation & magic-link templates");
