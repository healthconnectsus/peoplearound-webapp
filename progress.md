# Progress

A running log of every commit. Newest first.

Each entry: `### <date> — <message>` followed by what changed. New entries are
added automatically by `npm run ship` (see `scripts/ship.mjs`).

<!-- New entries go directly below this line. -->

### 2026-08-04 — Align content precisely with the top search bar: left-align the search column, normalize page padding to px-4/lg:px-8 everywhere

- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/TopBar.tsx`


### 2026-08-04 — Project cover photos (9 generated images on demo projects, feed card + detail hero) and left-align app content with the search bar

- `public/photos/air-quality.jpg`
- `public/photos/choir.jpg`
- `public/photos/contact-tree.jpg`
- `public/photos/costumes.jpg`
- `public/photos/midnight-football.jpg`
- `public/photos/park-cleanup.jpg`
- `public/photos/solar-roof.jpg`
- `public/photos/swim-lessons.jpg`
- `public/photos/window-boxes.jpg`
- `scripts/demo-seed-large.sql`
- `scripts/generate-demo-seed.mjs`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/settings/page.tsx`
- `src/lib/projects.ts`
- `supabase/migrations/0018_project_photos.sql`


### 2026-08-04 — Anti-abuse pass: DB-enforced per-user caps (projects/communities/conversations/messages/AI shaping), 429 on shape-idea, Turnstile CAPTCHA wiring

- `docs/ARCHITECTURE.md`
- `scripts/configure-captcha.mjs`
- `src/app/api/shape-idea/route.ts`
- `src/app/login/actions.ts`
- `src/app/login/page.tsx`
- `supabase/migrations/0017_abuse_caps.sql`


### 2026-08-04 — Marketing: public /start landing page (run club / pickup soccer / pickleball starter plans), docs/MARKETING.md with sports-association outreach plan and email templates

- `docs/MARKETING.md`
- `src/app/start/page.tsx`
- `src/lib/supabase/proxy.ts`


### 2026-08-04 — Docs: properly document messaging (/chats, participant-scoped RLS) and multi-community membership; fix stale neighborhoods write-path claim

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/UX_SPEC.md`


### 2026-08-04 — Badge patch: extend the P's stem below the ribbon (foot was hidden); celebrate new badges on the home feed so founding fires at first login

- `src/app/page.tsx`
- `src/components/BadgeMedallion.tsx`


### 2026-08-04 — Badge patches (P-silhouette + gradient ribbon, per brand mockups) and one-time unlock celebration with confetti; dev badge gallery

- `docs/INCENTIVES.md`
- `src/app/dev/badges/page.tsx`
- `src/app/profile/page.tsx`
- `src/components/BadgeCelebration.tsx`
- `src/components/BadgeMedallion.tsx`
- `src/lib/supabase/proxy.ts`


### 2026-08-04 — Badges v1 (derived medallions, earned-only), delete-account with confirm lightbox, branded auth emails via Resend SMTP; INCENTIVES.md updated

- `docs/INCENTIVES.md`
- `scripts/configure-auth-email.mjs`
- `src/app/profile/DeleteAccountButton.tsx`
- `src/app/profile/actions.ts`
- `src/app/profile/page.tsx`
- `src/components/BadgeMedallion.tsx`
- `src/lib/badges.ts`


### 2026-08-04 — Add INCENTIVES.md living incentives record; bring docs up to date: frontier locations, security posture, auto-locate onboarding, founding neighbors, communities generalization

- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/INCENTIVES.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/UX_SPEC.md`


### 2026-08-03 — Founding Neighbors incentive: permanent first-10 status, personal invite links with attribution (invited_by), founding-era growth banner

- `src/app/invite/CopyLinkButton.tsx`
- `src/app/invite/page.tsx`
- `src/app/page.tsx`
- `src/lib/supabase/proxy.ts`
- `supabase/migrations/0016_invite_attribution.sql`


### 2026-08-03 — Require sign-up before frontier registration: anonymous visitors get name preview only; place is created on first signed-in visit

- `src/app/api/register-location/route.ts`
- `src/app/login/AutoLocate.tsx`
- `src/app/page.tsx`
- `src/lib/frontier.ts`


### 2026-08-03 — Harden frontier endpoint: service-role-only register RPC, DB-enforced per-IP and global daily caps, origin check, in-memory throttle, salted IP hashing

- `package-lock.json`
- `package.json`
- `src/app/api/register-location/route.ts`
- `src/lib/supabase/admin.ts`
- `supabase/migrations/0015_frontier_hardening.sql`


### 2026-08-03 — Frontier locations: auto-register uncovered places (Nominatim + dedupe) and email ops alert; neighborhood centers for matching

- `src/app/api/register-location/route.ts`
- `src/app/login/AutoLocate.tsx`
- `src/lib/supabase/proxy.ts`
- `supabase/migrations/0014_frontier_locations.sql`


### 2026-08-03 — Auto location popup for logged-out visitors: anon locate_teaser RPC, landing teaser banner, neighborhood auto-claim after sign-up

- `src/app/login/AutoLocate.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `supabase/migrations/0013_public_locate.sql`


### 2026-07-31 — Landing ideas: 3-column photo card grid with collage crops

- `src/app/login/page.tsx`


### 2026-07-31 — Hero overlay: deepen mid and bottom stops (via 60, to 35)

- `src/app/login/page.tsx`


### 2026-07-31 — Hero overlay: vertical gradient, dark at top easing lighter at bottom

- `src/app/login/page.tsx`


### 2026-07-31 — Full-bleed hero collage to page top; white nav + dark-variant logo over photo

- `src/app/login/page.tsx`


### 2026-07-31 — Fix ambiguous profiles->neighborhoods embeds after 0011 (broke home redirect); photo collage hero with dark overlay

- `public/hero-collage.jpg`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/TopBar.tsx`


### 2026-07-31 — Fix onboarding dead-end: joining a community falls back to setting primary before migration 0011

- `src/app/neighborhood/communityActions.ts`


### 2026-07-31 — Hero collage of project tiles on the landing page

- `src/app/login/page.tsx`


### 2026-07-31 — Nextdoor-style logged-out landing page with live public ideas list (migration 0012)

- `src/app/login/page.tsx`
- `supabase/migrations/0012_public_ideas.sql`


### 2026-07-31 — Messaging (chats) + multi-community membership with kinds; migration 0011

- `README.md`
- `src/app/chats/Composer.tsx`
- `src/app/chats/MarkRead.tsx`
- `src/app/chats/actions.ts`
- `src/app/chats/page.tsx`
- `src/app/connections/page.tsx`
- `src/app/neighborhood/communityActions.ts`
- `src/app/neighborhood/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBarIcons.tsx`
- `src/lib/communities.ts`
- `supabase/migrations/0011_communities_and_chats.sql`


### 2026-07-31 — Nextdoor-style Edit Profile (bio/pronouns/hometown/photos), lucide outline icons, tagline in docs

- `README.md`
- `docs/CONCEPT.md`
- `package-lock.json`
- `package.json`
- `src/app/profile/page.tsx`
- `src/app/settings/PhotoUploads.tsx`
- `src/app/settings/actions.ts`
- `src/app/settings/page.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`
- `supabase/migrations/0010_profile_fields.sql`


### 2026-07-31 — New tagline: Build ideas with your communities

- `src/app/help/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`


### 2026-07-31 — Profile page + Nextdoor-style dropdown header with View profile

- `src/app/profile/page.tsx`
- `src/components/ProfileMenu.tsx`


### 2026-07-31 — Top bar: notifications bell (join requests + stars) and messages icon

- `src/components/TopBar.tsx`
- `src/components/TopBarIcons.tsx`


### 2026-07-31 — Home title: Communities (city/your ideas/total ideas)

- `src/app/page.tsx`


### 2026-07-31 — Top bar alignment + transparency, My ideas + My connections pages, My community block with neighborhood stats

- `src/app/connections/page.tsx`
- `src/app/ideas/page.tsx`
- `src/app/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`


### 2026-07-31 — Bigger sidebar logo (full-width in a wider rail)

- `src/components/Sidebar.tsx`
- `src/components/SiteHeader.tsx`


### 2026-07-30 — Nextdoor-style chrome: top bar with search + profile menu, expanded sidebar, new Events/People/Faves/Groups/Settings/Help/Invite pages

- `src/app/events/page.tsx`
- `src/app/faves/page.tsx`
- `src/app/groups/page.tsx`
- `src/app/help/page.tsx`
- `src/app/invite/CopyLinkButton.tsx`
- `src/app/invite/page.tsx`
- `src/app/page.tsx`
- `src/app/people/page.tsx`
- `src/app/settings/actions.ts`
- `src/app/settings/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`


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
