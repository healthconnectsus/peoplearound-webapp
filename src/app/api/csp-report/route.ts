import { NextResponse } from "next/server";

/**
 * Where browsers post Content Security Policy violations.
 *
 * This exists because the policy is being rolled out report-only: the only way
 * to know whether enforcing it would break a real person's page is to collect
 * what real browsers say about it. My own testing covers one browser with no
 * extensions; violations that only happen in Safari, or behind a corporate
 * proxy that rewrites pages, show up here or nowhere.
 *
 * It is unauthenticated by necessity — the browser posts it before any of our
 * code runs, with no session — so it is written to be dull on purpose:
 *
 *   - reads at most 16 KB, so a huge body cannot be used to burn memory;
 *   - copies out only known fields, each truncated, so nothing an attacker
 *     writes can flood or forge a log line;
 *   - caps how many lines one server instance will emit per minute, so it
 *     cannot be turned into a log-spend attack;
 *   - stores nothing and answers 204 to everything, so there is no state to
 *     corrupt and nothing to learn from the response.
 */

export const runtime = "nodejs";

const MAX_BODY = 16 * 1024;
const MAX_FIELD = 300;

// Per-instance, per-minute cap. Deliberately not shared state: this is a log
// throttle, not a security control, and a Redis round trip per violation
// report would cost more than the thing it protects.
const WINDOW_MS = 60_000;
let windowStart = 0;
let windowCount = 0;
const MAX_PER_WINDOW = 40;

function allowed(now: number): boolean {
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  if (windowCount === MAX_PER_WINDOW + 1) {
    console.warn("[csp] report flood — suppressing for the rest of the minute");
  }
  return windowCount <= MAX_PER_WINDOW;
}

function clip(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length === 0) return undefined;
  // Strip newlines so a report cannot forge extra log lines.
  const flat = v.replace(/[\r\n]+/g, " ");
  return flat.length > MAX_FIELD ? `${flat.slice(0, MAX_FIELD)}…` : flat;
}

/**
 * Two wire formats, because browsers disagree. `report-uri` posts
 * `{"csp-report": {...}}` with hyphenated keys; `report-to` posts an array of
 * `{type, body}` with camelCase ones. Normalising here keeps the log readable
 * whichever browser is talking.
 */
function normalize(payload: unknown): Record<string, string | undefined>[] {
  const out: Record<string, string | undefined>[] = [];

  const one = (r: Record<string, unknown>) => ({
    directive: clip(r["effective-directive"] ?? r.effectiveDirective),
    blocked: clip(r["blocked-uri"] ?? r.blockedURL),
    document: clip(r["document-uri"] ?? r.documentURL),
    source: clip(r["source-file"] ?? r.sourceFile),
    line: clip(String(r["line-number"] ?? r.lineNumber ?? "")),
    disposition: clip(r.disposition),
  });

  if (Array.isArray(payload)) {
    for (const item of payload.slice(0, 10)) {
      if (item && typeof item === "object") {
        const body = (item as Record<string, unknown>).body;
        if (body && typeof body === "object") {
          out.push(one(body as Record<string, unknown>));
        }
      }
    }
  } else if (payload && typeof payload === "object") {
    const wrapped = (payload as Record<string, unknown>)["csp-report"];
    if (wrapped && typeof wrapped === "object") {
      out.push(one(wrapped as Record<string, unknown>));
    }
  }

  return out;
}

export async function POST(request: Request) {
  // 204 regardless of what happens below. A violation report is fire and
  // forget; telling a caller why we ignored theirs is free reconnaissance.
  const done = new NextResponse(null, { status: 204 });

  try {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY) return done;

    const text = await request.text();
    if (text.length > MAX_BODY) return done;

    const reports = normalize(JSON.parse(text));
    for (const r of reports) {
      if (!r.directive && !r.blocked) continue;
      if (!allowed(Date.now())) break;
      console.warn(
        `[csp] ${r.disposition ?? "report"} ${r.directive ?? "?"} blocked=${
          r.blocked ?? "?"
        } on=${r.document ?? "?"} src=${r.source ?? "?"}:${r.line ?? "?"}`,
      );
    }
  } catch {
    // Malformed JSON, a truncated body, a browser inventing a new shape —
    // none of it is worth an error path.
  }

  return done;
}
