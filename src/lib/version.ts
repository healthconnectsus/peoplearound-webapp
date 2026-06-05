/**
 * Build-time version info, injected via next.config.ts.
 *
 * - NEXT_PUBLIC_COMMIT_SHA: short git SHA of the build (e.g. "a1b2c3d")
 * - NEXT_PUBLIC_BUILD_TIME: ISO timestamp of when the build ran
 *
 * On Vercel the SHA comes from VERCEL_GIT_COMMIT_SHA; locally it's read from
 * git. Falls back to "dev" when neither is available.
 */
export const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

/** Human-friendly version label, e.g. "v0.1.0 · a1b2c3d". */
export function versionLabel(): string {
  const pkgVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
  return `v${pkgVersion} · ${COMMIT_SHA}`;
}
