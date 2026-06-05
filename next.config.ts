import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/** Resolve the short commit SHA at build time (Vercel env or local git). */
function commitSha(): string {
  // VERCEL_GIT_COMMIT_SHA on Git-integration deploys; SHIP_COMMIT_SHA is
  // passed by scripts/ship.mjs for CLI deploys (where .git isn't uploaded).
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.SHIP_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const appVersion = process.env.npm_package_version ?? "0.1.0";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
