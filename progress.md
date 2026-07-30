# Progress

A running log of every commit. Newest first.

Each entry: `### <date> — <message>` followed by what changed. New entries are
added automatically by `npm run ship` (see `scripts/ship.mjs`).

<!-- New entries go directly below this line. -->

### 2026-07-30 — Nextdoor-style sidebar on desktop + more saturated logo colors

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-30 — Logo v3: fattened letterforms via polygon offset to match reference weight

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-07-30 — Logo v2: pastel translucent letter palette per new reference

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`


### 2026-07-30 — New logo: colorful overlapping DINASTI wordmark, adaptive light/dark SVG + favicon

- `public/logo-dark.svg`
- `public/logo-light.svg`
- `public/logo.svg`
- `src/app/icon.svg`
- `src/app/login/page.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-29 — Split app shell: sticky full-height map beside feed, stat-chip pulse, elevated cards on warm background; seed centered on Aurora CO

- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-29 — Redesign feed: neighborhood map (Leaflet/OSM), pulse header, reach zones, story-beat cards, avatars; location picker in wizard; seed pins

- `docs/DATA_MODEL.md`
- `docs/UX_SPEC.md`
- `package-lock.json`
- `package.json`
- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/components/MapPicker.tsx`
- `src/components/NeighborhoodMap.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0009_project_location.sql`


### 2026-07-29 — Fix demo seed owner rotation so projects spread across all three neighborhoods

- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`


### 2026-07-29 — Add large demo seed generator: 100 users across 3 neighborhoods and 2 cities, 30 projects using help/reach

- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`


### 2026-07-29 — Add help kind + reach (neighborhood/city/global, RLS-enforced) and rebuild create flow as a 4-step wizard

- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/UX_SPEC.md`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0008_help_and_reach.sql`


### 2026-07-29 — Add demo seed script: six neighbors, three weeks of simulated activity across the full loop

- `scripts/demo-seed.sql`


### 2026-07-28 — Add neighborhood scoping (PostGIS) + realtime: hard RLS boundary, /neighborhood picker with geolocation, live-updating feed

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `src/app/neighborhood/LocateButton.tsx`
- `src/app/neighborhood/actions.ts`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/components/LiveRefresh.tsx`
- `supabase/migrations/0007_neighborhoods.sql`


### 2026-07-28 — Add project history timeline: The story so far - idea, day-clustered stars, joins, confirmed contributions, events, completion

- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`
- `src/app/projects/[id]/page.tsx`
- `src/lib/projects.ts`


### 2026-07-28 — Add events + RSVPs: founder plans time/place, neighbors signal I'm-in; no no-show data by design; Happening-soon strip on feed

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `src/app/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0006_events.sql`


### 2026-07-28 — Revoke reconcile_contributions execute from anon (Supabase default-privilege hygiene)

- `supabase/migrations/0005_contributions.sql`


### 2026-07-28 — Add contributions + attestations trust layer: logged -> accepted -> confirmed with co-attestation, RLS anti-self-crediting, 7-day founder bypass

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `package-lock.json`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/actions.ts`
- `src/lib/projects.ts`
- `supabase/migrations/0005_contributions.sql`


### 2026-07-28 — Docs v2 for project pivot; add AI talk-it-out idea shaping (Claude + voice input)

- `.env.example`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CONCEPT.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`
- `package-lock.json`
- `package.json`
- `src/app/api/shape-idea/route.ts`
- `src/app/projects/new/IdeaForm.tsx`
- `src/app/projects/new/page.tsx`


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
