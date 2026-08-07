# Peoplearound — Roadmap

*Derived from PRD MVP scope, sequencing, metrics, and risks · Draft v2 (project pivot)*

> "As impactful as Facebook" is an outcome, not a starting strategy. Win one neighborhood completely, then template it.

The sequencing principle: **prove the human loop by hand before building much software.** Software built before you understand the human behavior tends to fail.

## Phase 0 — One neighborhood pilot (MVP)

The goal of this phase is to prove the join-and-build loop works in a single neighborhood, in a single project category.

**Shipped so far (web MVP, live on Vercel):**

- ✅ [Projects](PRD.md#31-projects-living-pages--p0-shipped-web) — joinable living pages with `idea → active → completed` lifecycle (never "failed")
- ✅ [Stars](PRD.md#32-stars--p0-shipped-web) — the isolation-defeating signal
- ✅ [Memberships](PRD.md#33-memberships-the-join-flow--p0-shipped-web) — ask-to-join → founder approves; leave anytime; RLS-enforced
- ✅ [AI idea shaping](PRD.md#39-ai-agent-the-gardener--p1-shaping-shipped-nudgingoff-ramp-post-mvp) — talk your idea out (typed or voice), Claude structures the post
- ✅ Basic feed — projects with team size + star counts
- ✅ Auth (email/password + magic link), ship pipeline, idempotent migrations
- ✅ [Contributions + acknowledgment](PRD.md#34-contributions-and-acknowledgment--p0-shipped-web) — the trust core: `logged → accepted → confirmed` with co-attestation, no self-crediting, and a 7-day community bypass around unresponsive founders
- ✅ [Events](PRD.md#36-events--p0-shipped-web) — founder plans a time and place, neighbors signal "I'm in"; no no-show data exists anywhere; past events prompt contribution logging
- ✅ Project history timeline — "The story so far" on each project page: idea → stars → joins → confirmed contributions → events → completion
- ✅ Neighborhood scoping (PostGIS) — the hard boundary: everything a user sees, stars, joins, or builds is scoped to their picked neighborhood via RLS; location → neighborhood detection when a boundary polygon is drawn
- ✅ Realtime feed — the feed and project pages refresh live via Supabase Realtime (RLS-filtered)
- ✅ Help kind + reach — founders declare what help they need (hands nearby / online / both) and who can find the project (neighborhood default / city / global, RLS-enforced); 4-step share-an-idea wizard
- ✅ Map-first feed — split app shell with a full-height neighborhood map (Leaflet/OSM), pulse header, reach zones, story-beat cards; optional map pin in the wizard
- ✅ Auto-locate onboarding — logged-out visitors get the location popup; covered areas show a live local teaser, uncovered areas a founding preview; neighborhood claimed silently at sign-up
- ✅ [Frontier locations](ARCHITECTURE.md#frontier-locations-live) — new places self-register when a real account signs up there (Nominatim naming, dedup, DB-enforced caps, service-role-only writes) + ops alert email (Resend, verified domain)
- ✅ [Founding Neighbors incentives](INCENTIVES.md) — permanent first-10 status, personal invite links with `invited_by` attribution, founding-era growth banner
- ✅ Photo uploads — public `projects` bucket, client-side downscaling, cover photo in the wizard and on project pages
- ✅ [Project updates](DATA_MODEL.md#project_updates) — founder/teammate build-log posts that land in the history timeline
- ✅ [Badges + celebration](INCENTIVES.md) — seven derived patch badges with a one-time unlock moment
- ✅ Community moderation — one-flag-per-neighbor reporting with an ops review email at 3 flags; nothing auto-hidden
- ✅ Private analytics — `/analytics`: looking→helping funnel, 30-day view trend, per-idea table (views never identify viewers)
- ✅ Anti-abuse + [scaling](SCALING.md) pass — per-user DB rate caps, Turnstile wiring, filtered/visibility-gated realtime, image downscaling, swappable map tiles
- ✅ Notifications + weekly digest — trigger-fanned inbox behind the bell; one calm Resend email a week (quiet weeks send nothing), Settings opt-out
- ✅ Ops essentials — `/admin` console (flag queue, community cleanup), add-to-calendar on events, feed filter chips, onboarding first-action nudge
- ✅ [Offers board](DATA_MODEL.md#offers) — give / lend / offer a skill, claimable by neighbors; no money anywhere (PRD §3.8)
- ✅ Co-organizers — progression that unlocks responsibility: founders share stewardship (joins, events, accepting others' work)
- ✅ [AI Gardener nudges](PRD.md#39-ai-agent-the-gardener--p1-shaping-shipped-nudgingoff-ramp-post-mvp) — private stall nudges and dignified off-ramps for quiet projects
- ✅ [Reputation & skills](PRD.md#35-reputation-and-skills--p1) — assembled from confirmed contributions, ranked by distinct attesters
- ✅ Communities generalization — neighborhoods extended with kinds (cultural/hobby/interest…), multi-membership (`community_members`), messaging tables; profile fields + public landing teaser

**All Phase 0 software is live.** What remains is the human part: run the pilot in one real neighborhood and meet the exit criteria below. (Neighborhood *verification* — phone + address — is deliberately later; today neighborhoods are self-selected.)

**Scope decisions:**

- Single neighborhood, single project category — the one where joining is most natural (likely community/practical projects).
- **Manual ops acceptable** — prove the loop by hand before automating.
- Web-first; mobile (React Native + Expo) once the loop is proven.

**Exit criteria:** the loop runs end to end without hand-holding — projects attract stars, stars convert to join requests, teams form, and at least one project reaches completion through real, co-attested help.

## Phase 1 — Deepen

Enrich the proven loop and broaden within the same neighborhood.

- [Recognition layer](PRD.md#310-recognition-and-progression--p1) — badges + private personal impact score first
- Expand to additional project categories within the same neighborhood

## Phase 2 — Template and expand

Replicate, then revisit the business model deliberately.

- Replicate the proven playbook to the next neighborhoods.
- Progression (trust-based responsibility) and gentle quests.
- **Revisit monetization deliberately** — only models where the *user*, not a sponsor, is the customer. No ads, no marketplace, no selling the lonely person.

## Success metrics

Metrics deliberately measure mattering, not engagement.

| Metric | Type |
|---|---|
| Attested contributions per active user per month | **North star** |
| Share of projects with ≥1 join request within 14 days | Loop health |
| Share of stargazers who convert to joiners (and joiners to contributors) | Funnel health |
| Share of newcomers whose first action is a star, join, or RSVP | On-ramp health |
| AI agent interactions per human join/contribution | **Anti-metric** (minimize) |

A rising anti-metric means the agent is replacing connection rather than enabling it — treat as a regression.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| **The unit problem** — a real, attributable contribution that isn't gameable | New-state ("merged commit") test + mandatory co-attestation |
| **Local cold-start** — thousands of tiny networks, each useless until dense | One neighborhood, won completely, by hand |
| **Acknowledgment bottleneck** — flaky founders | Community attestation routes around them |
| **Public failure harming the lost** | No `failed` state; graceful archive and redirect |
| **Monetization drift** — the easy path betrays users | Deferred deliberately; the user must remain the customer |

## Guardrails (every phase)

These do not get relaxed under engagement pressure — see [UX anti-patterns](UX_SPEC.md#6-ux-anti-patterns-do-not-build):

- No public leaderboard ranking individuals.
- No badges/points as bait — recognition follows contribution.
- No activity-volume rewards, no punitive streaks.
- No screen that displays or implies a project "failed."
- No cash marketplace or checkout.
- No AI agent prominent enough to replace human connection.

> The mission is to restore the feeling of mattering. Every scope decision serves that, or it is cut.
