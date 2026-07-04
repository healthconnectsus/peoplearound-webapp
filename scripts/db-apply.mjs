#!/usr/bin/env node
/**
 * db-apply.mjs — run a SQL migration against Supabase via the Management API.
 *
 * Usage: node scripts/db-apply.mjs supabase/migrations/0002_xxx.sql
 *
 * Reads SUPABASE_ACCESS_TOKEN (a Personal Access Token) and
 * SUPABASE_PROJECT_REF from the environment or .env.local. Both are gitignored.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function envLocal(key) {
  try {
    const text = readFileSync(resolve(root, ".env.local"), "utf8");
    const line = text.split("\n").find((l) => l.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf("=") + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/db-apply.mjs <migration.sql>");
  process.exit(1);
}

const token =
  process.env.SUPABASE_ACCESS_TOKEN || envLocal("SUPABASE_ACCESS_TOKEN");
const ref = process.env.SUPABASE_PROJECT_REF || envLocal("SUPABASE_PROJECT_REF");
if (!token || !ref) {
  console.error("✗ Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
  process.exit(1);
}

const sql = readFileSync(resolve(root, file), "utf8");
const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);
const text = await res.text();
if (!res.ok) {
  console.error(`✗ HTTP ${res.status}: ${text.slice(0, 400)}`);
  process.exit(1);
}
console.log(`✅ applied ${file} (HTTP ${res.status})`);
