# Peoplearound — Product Requirements Document

**Achieve goals together.** · *PRD · Draft v1*

| | |
|---|---|
| **Product** | Peoplearound — a hyperlocal network where neighbors achieve goals together |
| **Platform** | Mobile-first (iOS + Android), mobile-app-driven strategy |
| **Stack** | React Native (Expo) + Supabase (Postgres/PostGIS, Auth, Realtime, Storage, Edge Functions) |
| **Status** | Pre-MVP — defining scope for first neighborhood pilot |

## Contents

1. [Overview and goals](#1-overview-and-goals)
2. [Users and core jobs](#2-users-and-core-jobs)
3. [Features and requirements](#3-features-and-requirements)
4. [Technical architecture](#4-technical-architecture)
5. [MVP scope and sequencing](#5-mvp-scope-and-sequencing)
6. [Success metrics](#6-success-metrics)
7. [Risks and open questions](#7-risks-and-open-questions)

---

## 1. Overview and goals

Peoplearound is a hyperlocal mobile network where people declare goals and the neighbors around them help achieve them. Borrowing the logic of open-source collaboration, every contribution is attributed, confirmed by others, and recorded permanently. The product restores the feeling of mattering by making contribution — not posting or transaction — the currency of worth.

### Product goals

- Make it effortless to declare a local goal and gather real help around it.
- Make every meaningful contribution visible, attributed, and confirmed by more than one person.
- Turn isolated people into needed contributors through low-stakes on-ramps (stars, events, offers).
- Prove the contribution loop in a single neighborhood before scaling.

### Explicit non-goals (for MVP)

- **No cash marketplace.** Commerce is deferred; "for sale" is replaced by offer/give/lend that feeds contributions.
- **No public leaderboards** or vanity metrics.
- **No global / non-local social graph.** Everything is scoped to neighborhood.
- **No sponsorship or advertiser monetization** at foundation level.

> **Guiding constraint:** any feature that makes worth come from claiming, transacting, or competing is out of scope, however much it would drive engagement.

## 2. Users and core jobs

| Persona | Core job to be done |
|---|---|
| **Goal owner** | "Help me make a real-world goal happen with people near me, and show me I'm not alone." |
| **Contributor** | "Let me help in a way that is acknowledged and recorded — so I feel needed and can leave without penalty." |
| **Lurker / stargazer** | "Let me signal support and stay aware of what's happening before I commit to anything." |
| **Newcomer / lost** | "Give me a tiny, low-stakes way in — one event, one offer — before I commit to a whole project." |

## 3. Features and requirements

### 3.1 Goals (living pages) — `P0`

The central object. A goal is a persistent page, not a disposable post, with state and an accumulating history.

- Owner creates a goal: title, description, category, location, optional photos.
- Goal has an explicit lifecycle state: **idea → active → completed**, or quietly archived. Never displayed as "failed."
- History feed on the goal records every star, accepted contribution, and event, in order.
- AI agent assists at creation to shape vague goals into contributable ones (see [3.8](#38-ai-agent-the-gardener--p1)).

### 3.2 Stars — `P0`

- Any neighbor can star a goal — a low-commitment "I'd be glad this existed" signal.
- Star count and stargazer identities are visible to the owner (defeats isolation).
- Stargazers can later be prompted to convert to contributors.

### 3.3 Contributions and acknowledgment — `P0`

The trust core of the product. **Logic must live server-side in Edge Functions, never client-side.**

- A contributor logs a contribution against a goal (knowledge, resource, skill, time, presence).
- A contribution must move the goal to a new state to count — the **"merged commit" test**.
- Owner accepts a contribution; it becomes fully credited only after **co-attestation from at least one other participant** (co-contributor or stargazer who witnessed it).
- **No self-crediting. Ever.** Enforced server-side.
- Credit routes around an unresponsive owner: community attestation can confirm a contribution if the owner fails to act within a window.
- A contributor can leave a goal at any time and retains credit for accepted work; no penalty, no abandoned stigma.

### 3.4 Reputation and skills — `P1`

- Reputation is assembled automatically from acknowledged contributions — never self-declared, never friend-endorsed.
- Skills emerge from accepted contributions backed by real artifacts (no LinkedIn-style endorsement layer).
- Reputation is contextual ("trusted on community projects in this neighborhood") and surfaced only where relevant.
- Ranking by acknowledged impact, not volume. No public leaderboard. Each user sees their own history privately.

### 3.5 Events — `P0`

- Owners create events on a goal: title, time, place. Contributors join / not (lightweight RSVP).
- RSVP is a coordination signal only — never a performance metric. Absence is never penalized.
- Presence rewardable: post-event, the owner (with co-attestation) can acknowledge who contributed there.
- Events serve as the gentlest on-ramp for newcomers and a defibrillator for stalling goals.

### 3.6 "What's happening?" feed — `P0`

- A realtime, location-scoped ambient feed showing active goals, new events, recent contributions, and offers nearby.
- Powered by Supabase Realtime; primary discovery surface ("the neighborhood is alive right now").
- Surfaces opportunities to contribute, not vanity content. No infinite-scroll engagement bait.

### 3.7 Offer / give / lend — `P1`

Replaces a "for sale" marketplace. No money changes hands in MVP.

- Neighbors post things to give, lend, or offer (a tool, a truck for a day, soil, a skill).
- An offer can be attached to a goal, where it becomes an acknowledged contribution.
- Designed to feed the contribution loop, not create a parallel cash economy. Commerce, if ever, is a deliberate later decision.

### 3.8 AI agent (the gardener) — `P1`

*(basic shaping at MVP, nudging/off-ramp post-MVP)*

- **Before posting:** shape vague goals into contributable, well-scoped ones.
- **During:** privately nudge stalling goals with one small concrete next step. Coach, not judge.
- **Off-ramp:** for goals that don't take off, offer a smaller version or redirect the person into a nearby active goal. Never label failure.
- **Success metric:** human contributions and acknowledgments happening — NOT agent interaction volume. The agent is scaffolding that fades.

### 3.9 Recognition and progression — `P1`

*(badges + personal impact score first; progression and quests post-MVP)*

A game-like layer for motivation and progress. **Governing rule: reward only what is acknowledged by others**, so every mechanic inherits the system's built-in anti-gaming protection. Recognition arrives *after* genuine contribution — it honors what was done, it never baits people into doing it.

**Badges — evidence, not trophies**

- Certify real, attested achievements (e.g. "Helped 5 community projects reach completion," "Trusted on grant-writing by 8 neighbors," "Showed up to 10 events").
- Every badge maps to attested contributions — never to activity volume or app usage. No "logged in 30 days" badges.
- Function as a résumé of deeds, confirmed by people.

**Personal impact score — private and weighted**

- A numeric signal of progress, accrued ONLY from attested contributions.
- Impact-weighted: one well-timed contribution that unblocked a stuck goal outweighs many trivial ones.
- Primarily private — a personal sense of progress, like a fitness streak. Never a public ranking of neighbors.

**Progression — trust, not cosmetics**

- Advancement unlocks responsibility, not vanity levels: trusted users can attest others' contributions, mentor newcomers, or help steward a goal.
- The reward for helping is being trusted to help more — progression compounds the mission.

**Gentle quests — invitational, never punitive**

- Soft prompts toward contributing nearby ("3 goals near you could use a hand this week").
- No breakable streaks, no guilt for absence. Same asymmetry as event RSVPs: upside for showing up, no penalty for life getting in the way.

**Collective recognition — celebrate work, not rank people**

- Any leaderboard impulse points at goals ("most active projects this month") or the neighborhood collectively ("our neighborhood completed 40 goals this year").
- Never a ranked list of individuals.

**Explicit non-goals (anti-patterns — do not reintroduce under engagement pressure)**

- No public leaderboard ranking individuals — makes worth zero-sum and shames the bottom.
- No badges or points dangled as bait — recognition follows contribution, never precedes it.
- No activity-volume rewards — nothing rewards logins, posts, or comments detached from acknowledged help.
- No punitive streaks — nothing penalizes absence or breaks a chain.

> **The test for any game mechanic:** does it reward being acknowledged for real help, or does it reward activity for its own sake? Only the former ships.

## 4. Technical architecture

### 4.1 Stack rationale

Chosen to maximize reuse of existing Supabase/React expertise while fitting a mobile-app-driven, hyperlocal product.

| Layer | Choice and reason |
|---|---|
| **Mobile client** | React Native + Expo — managed builds, OTA updates, push, camera, and location out of the box. |
| **Backend / DB** | Supabase Postgres — Row-Level Security enforces neighborhood scoping and anti-tamper rules. |
| **Geo** | PostGIS extension — location-radius queries for hyperlocal feed, goals, and offers. |
| **Realtime** | Supabase Realtime — powers "What's happening?" and live goal updates. |
| **Auth** | Supabase Auth — phone/email; identity tied to a verified neighborhood. |
| **Storage** | Supabase Storage — goal/event/offer photos. |
| **Trust logic** | Supabase Edge Functions (Deno/TypeScript) — acknowledgment, attestation, and reputation computed **server-side**. This is the anti-gaming boundary. |
| **AI agent** | Edge Function calling an LLM API; learns from acknowledgment data across goals to coach goal-shaping and nudges. |
| **Push** | Expo Notifications — stars received, contribution acknowledged, event reminders, nudges. |

### 4.2 Critical architectural rules

- **Trust-sensitive logic is server-only.** Acknowledgment, attestation, and reputation never run in the client or in raw client-writable SQL. They live in Edge Functions with RLS as a backstop.
- **No self-crediting, enforced in the database.** A user can never insert an accepted/attested record for their own contribution.
- **Neighborhood is a hard boundary.** RLS scopes reads/writes to a user's verified neighborhood(s).
- **Failure is invisible.** There is no "failed" state exposed in any API response or UI.

### 4.3 Core data model (sketch)

Indicative tables; not final schema. See [DATA_MODEL.md](DATA_MODEL.md) for detail.

- **users** — profile, verified neighborhood, auth link.
- **neighborhoods** — geo boundary (PostGIS), membership.
- **goals** — owner, title, description, category, location, state, timestamps.
- **stars** — goal_id, user_id (unique pair).
- **contributions** — goal_id, contributor_id, type, description, status (logged/accepted/attested), left_at nullable.
- **attestations** — contribution_id, attester_id (must ≠ contributor_id), timestamp.
- **events** — goal_id, title, time, place, rsvps.
- **offers** — user_id, type (give/lend/offer), description, optional goal_id link.
- **reputation (derived)** — computed from attested contributions; never directly writable.

## 5. MVP scope and sequencing

> "As impactful as Facebook" is an outcome, not a starting strategy. Win one neighborhood completely, then template it.

**Phase 0 — One neighborhood pilot (MVP)**

- P0 features only: Goals, Stars, Contributions + acknowledgment, Events, What's happening, basic AI goal-shaping.
- Single neighborhood, single goal category to start (the one where contribution is most natural — likely community/practical projects).
- Manual ops acceptable: prove the human loop by hand before automating.

**Phase 1 — Deepen**

- Reputation/skills, Offer/give/lend, AI nudging and off-ramps.
- Expand to additional goal categories within the same neighborhood.

**Phase 2 — Template and expand**

- Replicate the proven playbook to the next neighborhoods.
- Revisit monetization deliberately — only models where the user, not a sponsor, is the customer.

See [ROADMAP.md](ROADMAP.md) for the full sequencing.

## 6. Success metrics

Metrics deliberately measure mattering, not engagement.

- **North star:** number of attested contributions per active user per month.
- Share of goals that receive at least one acknowledged contribution within 14 days.
- Share of stargazers who convert to contributors.
- Share of newcomers whose first action is at an event or offer (on-ramp health).
- **Anti-metric (watch and minimize):** AI agent interactions per human contribution — rising means the agent is replacing connection, not enabling it.

## 7. Risks and open questions

- **The unit problem.** Defining a contribution that is real and attributable without becoming gameable is the central design challenge. *Mitigation:* the new-state test + mandatory co-attestation.
- **Local cold-start.** Thousands of tiny networks, each useless until dense. *Mitigation:* one neighborhood, won completely, by hand.
- **Acknowledgment bottleneck.** Flaky owners. *Mitigation:* community attestation routes around them.
- **Public failure harming the lost.** *Mitigation:* no failed state; graceful archive and redirect.
- **Monetization drift.** The easy path (marketplace, ads, sponsors) is how these products betray their users. *Mitigation:* deferred deliberately; user must remain the customer.

> The mission is to restore the feeling of mattering — to make sure the people around you know you are needed, and you know it too. Every scope decision serves that or is cut.
