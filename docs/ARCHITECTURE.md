# Peoplearound — Architecture

*Derived from the PRD technical sections · Draft v2 (project pivot)*

This document describes the system architecture for Peoplearound. It expands on [PRD §4](PRD.md#4-technical-architecture) and should be read alongside the [Data Model](DATA_MODEL.md).

## Design philosophy

The architecture exists to protect one thing: a **trustworthy record of what people actually built together**. Every technical decision below serves the anti-gaming boundary — the rule that worth is acknowledged by others, never self-declared. If a choice would let a user manufacture their own credit (or approve their own membership), it is wrong by definition.

## Current implementation (web MVP — live)

| Layer | Technology | Role |
|---|---|---|
| Web client | Next.js 16 (App Router) + React 19 + Tailwind v4 | Feed, project pages, create flow, join/approve UI |
| Hosting | Vercel | Auto-deploy from `main` + CLI deploys via `npm run ship` |
| Backend / DB | Supabase Postgres + RLS | `profiles` · `projects` · `stars` · `memberships` · `contributions` · `attestations` · `events` · `rsvps` · `project_updates` · `project_flags` · `project_views` · `user_action_log`; membership + trust rules enforced in RLS, confirmation in a security-definer function |
| Auth | Supabase Auth via `@supabase/ssr` | Email/password + magic link; session refresh + route guard in `src/proxy.ts` (Next 16's renamed middleware) |
| Geo | PostGIS + `neighborhoods` table | Hard neighborhood boundary in RLS; `find_neighborhood(lat,lng)` matches browser geolocation to a boundary polygon |
| Realtime | Supabase Realtime | `LiveRefresh` client component subscribes (RLS-filtered) and refreshes the feed + project pages on change; live chat delivery on `messages` |
| Communities | `neighborhoods.kind` + `community_members` | Multi-membership across neighborhood/cultural/hobby/identity/geographic/interest communities; `profiles.neighborhood_id` stays the primary and drives the feed |
| Messaging | `conversations` · `conversation_participants` · `messages` | `/chats`; participant-scoped RLS via the `is_participant()` security-definer helper; `last_read_at` unread tracking |
| AI idea shaping | Next.js route handler → DeepSeek (primary), Claude Haiku (fallback) | `/api/shape-idea`: free-form (typed or dictated) idea → structured `{title, description, category, state, tip}`; DeepSeek JSON mode with Claude Haiku 4.5 structured outputs as fallback; auth-gated and capped at 20/user/day; browser Web Speech API for voice input |
| Storage | Supabase Storage (`profiles`, `projects` buckets) | Avatars, covers, project photos; own-folder RLS, downscaled client-side before upload (see [SCALING](SCALING.md)) |
| Migrations | `supabase/migrations/` + `scripts/db-apply.mjs` | Idempotent SQL applied via the Supabase Management API |

## Target architecture (as the trust layer ships)

| Layer | Technology | Role |
|---|---|---|
| Installed web app | PWA (manifest + service worker) | Home-screen install, `/offline` fallback, opt-in Web Push via VAPID — the bridge until React Native |
| Mobile client | React Native + Expo | iOS/Android app; managed builds, OTA updates, push, camera, location |
| Geo | PostGIS | Location-radius queries for hyperlocal feed, projects, offers |
| Realtime | Supabase Realtime | "What's happening?" feed and live project updates |
| Storage | Supabase Storage | Project / event / offer photos |
| Trust logic | Supabase Edge Functions (Deno/TS) | Acknowledgment, attestation, reputation — server-side only |
| AI agent | Server-side → Claude API | Idea shaping (live), stall nudges, off-ramps; learns from acknowledgment data |
| Push | Expo Notifications | Stars received, join requests, contribution acknowledged, event reminders |

## Component view (target)

```
┌─────────────────────────────────────────────┐
│      Web (Next.js) + Mobile (RN/Expo)        │
│  Around · Projects · Create · Offers · Me    │
└───────────────┬──────────────────┬───────────┘
                │ realtime          │ RPC / writes
                │ subscribe         │
        ┌───────▼───────┐   ┌───────▼─────────────────┐
        │ Supabase       │   │ Server logic             │
        │ Realtime       │   │  • approve membership    │
        └───────┬───────┘   │  • accept contribution   │
                │           │  • attest contribution   │
                │           │  • compute reputation    │
                │           │  • AI agent (Claude API) │
                │           └───────┬─────────────────┘
                │                   │ privileged writes
        ┌───────▼───────────────────▼─────────────────┐
        │        Postgres + PostGIS (RLS on)           │
        │  profiles · neighborhoods · projects ·       │
        │  stars · memberships · contributions ·       │
        │  attestations · events · offers ·            │
        │  reputation (derived)                        │
        └───────────────────────┬─────────────────────┘
                                 │
                         ┌───────▼───────┐
                         │ Supabase      │
                         │ Storage       │
                         └───────────────┘
```

## Critical architectural rules

These are non-negotiable invariants. They are restated here because they constrain every feature.

### 1. Trust-sensitive logic is server-only

Membership approval, acknowledgment, attestation, and reputation **never** run in the client or in raw client-writable SQL. Today RLS enforces the membership rules; as the trust layer grows, Edge Functions hold the privileged write paths with RLS as backstop. The client may *request* to join, accept, or attest, but the state transition and all validation happen server-side.

### 2. No self-approval, no self-crediting — enforced in the database

Live today: a join request can only be created by the requester, always as `pending`, and only the project's founder can flip it to `accepted` — RLS makes self-approval impossible. Also live: a contribution can only be inserted by its contributor, always as `logged`; only the founder can accept, never their own work; an attester must differ from both the contributor and the founder; and `confirmed` is reachable only through a server-side security-definer function — clients cannot write it.

### 3. Neighborhood is a hard boundary *(live)*

RLS scopes reads and writes to a user's neighborhood. There is no global social graph. A user cannot see, star, or join projects outside their neighborhood: the `projects` select policy checks the viewer's `profiles.neighborhood_id`, and every child table (stars, memberships, contributions, attestations, events, rsvps) inherits the boundary because its policies require a visible project. Projects are stamped with the founder's neighborhood by a database trigger — the client cannot place a project elsewhere. Today the neighborhood is self-selected (list or geolocation match); *verification* (phone + address) is a later phase.

### 4. Failure is invisible

There is no "failed" state exposed in any API response or UI. Projects move `idea → active → completed`, or are quietly `archived`. No endpoint returns a failure flag; the off-ramp is handled by the AI agent, gently.

## Membership flow (live)

```
(neighbor) ──ask to join──> pending ──(founder accepts)──> accepted
     │                        │                               │
     │                        └──(founder declines)──> row deleted
     └──(cancel request / leave at any time)──> row deleted, no penalty
```

- RLS: insert only as self + `pending`; update only by founder; delete by self (leave) or founder (remove).
- The founder is the implicit first team member and has no membership row.

## Contribution & attestation flow (live)

The trust core, expressed as a state machine:

```
logged ──(founder accepts)──> accepted ──(≥1 co-attestation)──> confirmed
   │                                                              ▲
   └──(founder unresponsive 7 days)──> community attestation ─────┘
```

- **logged** — an accepted teammate records a contribution (RLS: own rows only, always `logged`; the founder has no membership row and therefore cannot log their own credit). While `logged`, the contributor may withdraw it and the founder may quietly decline it.
- **accepted** — founder confirms it landed (RLS: founder only, never the contributor, only the `logged → accepted` step).
- **confirmed** — at least one co-participant or witnessing stargazer attests (never the contributor, never the founder — acceptance and attestation must come from two different people). Only confirmed contributions count toward reputation and trigger the acknowledgment moment.
- **Founder bypass** — if the founder does not act within 7 days, community attestation alone moves a contribution to `confirmed`, so credit routes around a flaky founder.
- **Server-only confirmation** — the `confirmed` transition exists solely inside `reconcile_contributions()`, an idempotent security-definer function called after accept/attest actions and on project page load (which is what makes the 7-day window take effect lazily, with no cron needed). No client write path can produce `confirmed`.
- **Leaving** — a teammate may leave at any time (their membership row is deleted); contribution rows are retained, so previously `confirmed` work survives with no penalty.

The **"merged commit" test** is enforced semantically: a contribution should correspond to the project moving to a new state. This is a product rule reinforced by the acceptance step rather than something the system can fully verify automatically — see the *unit problem* in [PRD §7](PRD.md#7-risks-and-open-questions).

## Frontier locations (live)

How Peoplearound expands to places it doesn't cover yet — and why bots can't
abuse it:

```
logged-out visitor ──(browser geolocation popup)──> locate_teaser (anon RPC)
        │ match                                          │ no match
        ▼                                                ▼
"You're near Oak St — 34 neighbors"        PREVIEW only: Nominatim name,
+ pa-hood cookie                           "sign up to put it on the map"
        │                                  + pa-frontier coords cookie
        └───────────────┬──────────────────┘
                        ▼  (account created — first signed-in visit)
        home page claims the cookie: existing hood assigned, OR the new
        place is REGISTERED (register_frontier_location, service-role only)
        → visitor becomes its first neighbor → one ops alert email (Resend)
```

Defense in depth on the anonymous surface, outermost first:

1. Browser geolocation consent (nothing happens without it).
2. Same-origin check + in-memory per-IP throttle on `/api/register-location`.
3. **A signed-up account is required to create a location** — anonymous
   visitors get a read-only name preview; the strongest wall.
4. `register_frontier_location` is executable by `service_role` only (anon
   direct-RPC calls get `permission denied`).
5. Hard caps in the database: ≤3 new places per (salted, hashed) IP per
   24 h, ≤25 globally — which transitively bounds ops emails and Nominatim
   usage. Dedup: boundary match → neighborhood-center distance (<15 km) →
   nearest pinned project (<15 km).
6. `locate_teaser` stays anon-callable but returns only a neighborhood name
   and two aggregate counts.

Growth incentives built on this flow (founding neighbors, invite
attribution) are specified in [INCENTIVES.md](INCENTIVES.md).

## Reputation pipeline (planned)

Reputation is **derived, never directly writable**. It is computed (in Edge Functions / scheduled jobs) from `confirmed` contributions and their attestations:

- Impact-weighted, not volume-counted — a contribution that unblocked a stalled project outweighs many trivial ones.
- Contextual — surfaced as "trusted on X in this neighborhood," only where relevant.
- Private by default — each user sees their own history; **no public individual leaderboard** exists at any layer.

## AI agent

The agent's first job — **idea shaping** — is live: [`/api/shape-idea`](../src/app/api/shape-idea/route.ts) takes a free-form description (typed, or dictated via the browser's Web Speech API) and returns a structured draft (`title`, `description`, `category`, `state`, plus one improvement `tip`) using Claude structured outputs. It requires a signed-in user, degrades gracefully when unconfigured, and never blocks the manual form.

Later jobs (stall nudges, dignified off-ramps) follow the same constraint: the agent's success metric is **human** joins, contributions, and acknowledgments — not agent interactions. The acknowledgment ledger doubles as the agent's training signal. If usage data shows agent interactions rising relative to human activity (the anti-metric in [PRD §6](PRD.md#6-success-metrics)), that is treated as a regression.

## Security & privacy posture

- Auth via Supabase Auth (email/magic-link today; phone + verified neighborhood later).
- RLS is the primary enforcement layer for scoping and anti-tamper; server-side logic holds privileged write paths.
- The Claude API key lives server-side only (`ANTHROPIC_API_KEY`); the shape-idea endpoint requires an authenticated session.
- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY` (admin client in `src/lib/supabase/admin.ts`, guarded by `server-only`), `RESEND_API_KEY` + `ALERT_FROM`/`ALERT_EMAIL` (ops alerts from the verified `peoplearound.com` domain), `UNSPLASH_ACCESS_KEY` (free tier — the wizard's cover-photo step offers 3 real, keyword-searched stock photos alongside upload; `/api/unsplash-photos` and its `/track` download-tracking ping, required by Unsplash's API guidelines whenever a returned photo is actually used, keep the key server-side; unset means the picker hides itself rather than erroring).
- Visitor coordinates are used transiently (neighborhood lookup, one-time geocode); IPs are only ever stored as salted SHA-256 hashes in the frontier request log.
- **Per-user abuse caps** (migration 0017, DB-trigger enforced so accounts can't route around them): projects 10/day · communities 3/day (+`created_by` attribution) · conversations 20/day · messages 200/hour · AI idea-shaping 20/day (`consume_ai_credit()`; the shape-idea route returns 429 past the cap — every call costs Claude API money). Operator SQL and service-role paths are exempt.
- **Community moderation** (migration 0019): any neighbor can flag a project once (`project_flags`, RLS: own rows only, never your own project, capped at 10 flags/day). At **3 distinct flaggers** the server emails ops via `flag_review()` (service-role only) so a human community admin reviews it. **Nothing is auto-hidden** — removal is always a human decision, per "failure is invisible, dignity first."
- **Sign-up CAPTCHA** (Cloudflare Turnstile) is wired end to end — login forms render the widget when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, server actions forward the token, and `scripts/configure-captcha.mjs` enables verification in Supabase auth once `TURNSTILE_SECRET_KEY` exists.
- No monetization data paths exist in MVP (no marketplace, no checkout, no advertiser pipelines).
- Photos and user content will live in Supabase Storage, access-scoped to neighborhood.
