# Progress

A running log of every commit. Newest first.

Each entry: `### <date> — <message>` followed by what changed. New entries are
added automatically by `npm run ship` (see `scripts/ship.mjs`).

<!-- New entries go directly below this line. -->

### 2026-07-04 — Pivot to joinable projects: rename goals to projects, add stars + request/approve memberships, friendlier UX

- `.claude/launch.json`
- `scripts/db-apply.mjs`
- `src/app/goals/[id]/page.tsx`
- `src/app/goals/actions.ts`
- `src/app/goals/new/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/page.tsx`
- `src/components/SiteHeader.tsx`
- `src/lib/goals.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0002_rename_goals_to_projects.sql`
- `supabase/migrations/0003_stars.sql`
- `supabase/migrations/0004_memberships.sql`


### 2026-06-05 — Add Goals feature: profiles+goals schema with RLS, create/feed/detail, state transitions

- `src/app/goals/[id]/page.tsx`
- `src/app/goals/actions.ts`
- `src/app/goals/new/page.tsx`
- `src/app/page.tsx`
- `src/components/ConfirmSubmit.tsx`
- `src/components/SiteHeader.tsx`
- `src/lib/goals.ts`
- `supabase/migrations/0001_profiles_and_goals.sql`


### 2026-06-05 — Harden auth: forward root ?code= to /auth/confirm

- `src/lib/supabase/proxy.ts`


### 2026-06-05 — Use peoplearound logo on login and home pages

- `public/logo.png`
- `src/app/login/page.tsx`
- `src/app/page.tsx`


### 2026-06-05 — Make commit-version robust for CLI deploys; wire Vercel deploy into ship

- `.gitignore`
- `.vercelignore`
- `next.config.ts`
- `scripts/ship.mjs`


### 2026-06-05 — Fix ship changed-files parsing (clean paths)

- `progress.md`
- `scripts/ship.mjs`


### 2026-06-05 — Add ship automation: progress + commit + push + deploy

- `package.json`
- `progress.md`
- `scripts/ship.mjs`


### 2026-06-05 — Initial webapp scaffold + Supabase auth

**Initial webapp scaffold + Supabase auth.**

- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind v4) into the repo, preserving the existing product `docs/`.
- Added Supabase auth via `@supabase/ssr`:
  - Browser client (`src/lib/supabase/client.ts`) and server client (`src/lib/supabase/server.ts`, async `cookies()`).
  - Session refresh + route protection in `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`).
- Built the auth flow:
  - `/login` — email/password sign-in & sign-up, plus magic-link, via server actions.
  - `/auth/confirm` — verifies email confirmation / magic links (`token_hash` and PKCE `code`).
  - Protected `/` home with sign-out.
- **Commit version on the login page**: footer shows `vX.Y.Z · <commit>`, injected at build time in `next.config.ts` (Vercel `VERCEL_GIT_COMMIT_SHA` or local git).
- Env handling: real values in gitignored `.env.local`; `.env.example` committed as a template. Secret key kept server-side only, never committed.
