#!/usr/bin/env node
/**
 * ship.mjs — one-command release: document → commit → push → deploy.
 *
 * Usage:
 *   npm run ship -- "your commit message"
 *
 * What it does, with zero further interaction:
 *   1. Writes a dated entry to progress.md (message + changed files).
 *   2. Stages everything, commits, and pushes to origin.
 *   3. Deploys:
 *        - If VERCEL_TOKEN is set → deploys via the Vercel CLI directly.
 *        - Otherwise → relies on Vercel's Git integration (push auto-deploys).
 *
 * Push is non-interactive as long as git credentials are cached (Git
 * Credential Manager on Windows handles this after the first login).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS = resolve(root, "progress.md");
const MARKER = "<!-- New entries go directly below this line. -->";

const capture = (cmd) => execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });

/** Read a single key out of .env.local without adding a dependency. */
function envLocal(key) {
  try {
    const text = readFileSync(resolve(root, ".env.local"), "utf8");
    const line = text
      .split("\n")
      .find((l) => l.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf("=") + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

const msg = process.argv.slice(2).join(" ").trim();
if (!msg) {
  console.error('✗ Usage: npm run ship -- "your commit message"');
  process.exit(1);
}

const status = capture("git status --porcelain");
if (!status) {
  console.log("Nothing to ship — working tree is clean.");
  process.exit(0);
}

// 1. Document in progress.md (date + message + changed files).
const files = status
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(3).trim());
const date = new Date().toISOString().slice(0, 10);
const entry =
  `### ${date} — ${msg}\n\n` + files.map((f) => `- \`${f}\``).join("\n") + "\n";

const progress = readFileSync(PROGRESS, "utf8");
if (!progress.includes(MARKER)) {
  console.error(`✗ Could not find the insertion marker in progress.md.`);
  process.exit(1);
}
writeFileSync(PROGRESS, progress.replace(MARKER, `${MARKER}\n\n${entry}`));
console.log(`📝 progress.md updated (${files.length} file(s) changed).`);

// 2. Stage, commit, push.
run("git add -A");
const msgPath = resolve(root, ".git", "SHIP_EDITMSG");
writeFileSync(msgPath, `${msg}\n`);
run(`git commit -F "${msgPath}"`);
console.log(`✅ committed ${capture("git rev-parse --short HEAD")}`);
run("git push");
console.log("🚀 pushed to origin/main.");

// 3. Deploy.
const token = process.env.VERCEL_TOKEN || envLocal("VERCEL_TOKEN");
if (token) {
  console.log("▲ Deploying to Vercel (CLI)…");
  run(`npx --yes vercel@latest deploy --prod --yes --token ${token}`);
  console.log("▲ Vercel production deploy triggered.");
} else {
  console.log(
    "▲ Pushed. Vercel's Git integration will deploy this commit automatically.",
  );
}
