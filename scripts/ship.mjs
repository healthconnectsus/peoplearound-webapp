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

if (!capture("git status --porcelain")) {
  console.log("Nothing to ship — working tree is clean.");
  process.exit(0);
}

// 1. Stage everything, then read the exact committed paths (dirs expanded,
//    no status prefixes — clean for the changelog).
run("git add -A");
const files = capture("git diff --cached --name-only")
  .split("\n")
  .filter(Boolean);

// 2. Document in progress.md (date + message + changed files).
const date = new Date().toISOString().slice(0, 10);
const entry =
  `### ${date} — ${msg}\n\n` + files.map((f) => `- \`${f}\``).join("\n") + "\n";

const progress = readFileSync(PROGRESS, "utf8");
if (!progress.includes(MARKER)) {
  console.error(`✗ Could not find the insertion marker in progress.md.`);
  process.exit(1);
}
writeFileSync(PROGRESS, progress.replace(MARKER, `${MARKER}\n\n${entry}`));
run("git add progress.md");
console.log(`📝 progress.md updated (${files.length} file(s) changed).`);

// 3. Commit, push.
const msgPath = resolve(root, ".git", "SHIP_EDITMSG");
writeFileSync(msgPath, `${msg}\n`);
run(`git commit -F "${msgPath}"`);
console.log(`✅ committed ${capture("git rev-parse --short HEAD")}`);
run("git push");
console.log("🚀 pushed to origin/main.");

// 4. Deploy.
const token = process.env.VERCEL_TOKEN || envLocal("VERCEL_TOKEN");
const scope = "healthconnectsus-projects";
if (token) {
  console.log("▲ Deploying to Vercel (CLI)…");
  const fullSha = capture("git rev-parse HEAD");
  run(
    `npx --yes vercel@latest deploy --prod --yes` +
      ` --scope ${scope} --token ${token}` +
      ` --build-env SHIP_COMMIT_SHA=${fullSha}`,
  );
  console.log("▲ Vercel production deploy triggered.");
} else {
  console.log(
    "▲ Pushed. Vercel's Git integration will deploy this commit automatically.",
  );
}
