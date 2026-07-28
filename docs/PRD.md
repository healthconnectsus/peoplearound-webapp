# Peoplearound — Product Requirements Document

**Share an idea. Build it together.** · *PRD · Draft v2 (project pivot)*

| | |
|---|---|
| **Product** | Peoplearound — a hyperlocal network where neighbors share ideas/projects and join each other to build them |
| **Platform** | Web-first MVP (Next.js on Vercel) today; mobile (React Native + Expo) when the loop is proven |
| **Stack** | Next.js 16 + Supabase (Postgres, Auth, RLS) + Claude API; later: PostGIS, Realtime, Storage, Edge Functions |
| **Status** | Web MVP live — projects, stars, join requests, AI idea shaping. Defining scope for first neighborhood pilot |

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

Peoplearound is a hyperlocal network where people share ideas and projects, and the neighbors around them **join in** to bring them to life. Borrowing the logic of open-source collaboration, projects are public and joinable, and every contribution is attributed, confirmed by others, and recorded permanently. The product restores the feeling of mattering by making contribution — not posting or transaction — the currency of worth.

### Product goals

- Make it effortless to share a local idea/project and gather a real team around it.
- Make joining someone else's project a first-class, low-friction act (request → founder approves).
- Make every meaningful contribution visible, attributed, and confirmed by more than one person.
- Turn isolated people into needed teammates through low-stakes on-ramps (stars, events, offers).
- Prove the join-and-build loop in a single neighborhood before scaling.

### Explicit non-goals (for MVP)

- **No cash marketplace.** Commerce is deferred; "for sale" is replaced by offer/give/lend that feeds contributions.
- **No public leaderboards** or vanity metrics.
- **No global / non-local social graph.** Everything is scoped to neighborhood.
- **No sponsorship or advertiser monetization** at foundation level.

> **Guiding constraint:** any feature that makes worth come from claiming, transacting, or competing is out of scope, however much it would drive engagement.

## 2. Users and core jobs

| Persona | Core job to be done |
|---|---|
| **Founder** | "Help me turn my idea into a real project with people near me, and show me I'm not alone." |
| **Joiner / teammate** | "Let me be part of building something real, in a way that is acknowledged and recorded — so I feel needed and can leave without penalty." |
| **Lurker / stargazer** | "Let me signal support and stay aware of what's happening before I commit to anything." |
| **Newcomer / lost** | "Give me a tiny, low-stakes way in — one star, one event — before I commit to a whole project." |

## 3. Features and requirements

### 3.1 Projects (living pages) — `P0` ✅ *shipped (web)*

The central object. A project is a persistent, joinable page, not a disposable post, with state, a team, and an accumulating history.

- Founder creates a project: title, description, category; later location + photos.
- Project has an explicit lifecycle state: **idea → active (building) → completed**, or quietly archived. Never displayed as "failed."
- History feed on the project records every star, join, confirmed contribution, and event, in order. ✅ *shipped ("The story so far")*
- AI assists at creation to shape vague ideas into joinable projects (see [3.8](#38-ai-agent-the-gardener--p1)). ✅ *shipped*

### 3.2 Stars — `P0` ✅ *shipped (web)*

- Any neighbor can star a project — a low-commitment "I'd be glad this existed" signal.
- Star count is visible on the feed and project page (defeats isolation).
- Stargazers can later be prompted to convert to joiners.

### 3.3 Memberships (the join flow) — `P0` ✅ *shipped (web)*

The bridge between starring and contributing — what makes a project a team.

- A neighbor taps **Ask to join**; the founder sees the request and **accepts or declines**.
- Accepted members appear on the project's team alongside the founder.
- A member can **leave at any time**, and a pending request can be cancelled — no penalty, no stigma, credit for prior confirmed work retained.
- The founder can remove a member.
- Enforced server-side via RLS: requests always start `pending`; only the founder can accept; **you cannot approve your own request.**

### 3.4 Contributions and acknowledgment — `P0` ✅ *shipped (web)*

The trust core of the product. **Logic must live server-side, never client-side.**

- A teammate logs a contribution against a project (knowledge, resource, skill, time, presence). ✅
- A contribution must move the project to a new state to count — the **"merged commit" test** (a product rule reinforced by the founder's acceptance step).
- Founder accepts a contribution; it becomes fully credited only after **co-attestation from at least one other participant** (teammate or stargazer who witnessed it — never the founder, never the contributor). ✅
- **No self-crediting. Ever.** Enforced in RLS: teammates insert only as themselves and only as `logged`; only the founder can accept, never their own; `confirmed` is reachable only via a server-side security-definer function. ✅
- Credit routes around an unresponsive founder: community attestation confirms a contribution if the founder fails to act within 7 days. ✅
- The acknowledgment moment: a warm banner greets the contributor on recently confirmed work — "You were needed, and you showed up." ✅

### 3.5 Reputation and skills — `P1`

- Reputation is assembled automatically from acknowledged contributions — never self-declared, never friend-endorsed.
- Skills emerge from accepted contributions backed by real artifacts (no LinkedIn-style endorsement layer).
- Reputation is contextual ("trusted on community projects in this neighborhood") and surfaced only where relevant.
- Ranking by acknowledged impact, not volume. No public leaderboard. Each user sees their own history privately.

### 3.6 Events — `P0` ✅ *shipped (web)*

- Founders create events on a project: title, time, place. Anyone joins / not (lightweight RSVP). ✅
- RSVP is a coordination signal only — never a performance metric. Absence is never penalized: the `rsvp_status` enum has the single value `joining`, so no-show data cannot even be stored. ✅
- Presence rewardable: past events prompt attendees to log a contribution and the founder to accept it, feeding the trust layer. ✅
- Events serve as the gentlest on-ramp for newcomers and a defibrillator for stalling projects — upcoming events surface in a "Happening soon" strip at the top of the feed. ✅

### 3.7 "What's happening?" feed — `P0` ✅ *shipped (web)*

- A neighborhood-scoped ambient feed showing active projects, upcoming events ("Happening soon"), team sizes, and star counts. ✅
- Live-updates via Supabase Realtime (RLS-filtered) — a neighbor sharing an idea or starring a project appears without a reload. ✅
- Surfaces opportunities to join and contribute, not vanity content. No infinite-scroll engagement bait.

### 3.8 Offer / give / lend — `P1`

Replaces a "for sale" marketplace. No money changes hands in MVP.

- Neighbors post things to give, lend, or offer (a tool, a truck for a day, soil, a skill).
- An offer can be attached to a project, where it becomes an acknowledged contribution.
- Designed to feed the contribution loop, not create a parallel cash economy. Commerce, if ever, is a deliberate later decision.

### 3.9 AI agent (the gardener) — `P1` *(shaping shipped; nudging/off-ramp post-MVP)*

- **Before posting** ✅ *shipped:* the create page's "Just talk it out" box — a person describes their idea in their own words, **typed or spoken aloud** (browser speech recognition), and Claude shapes it into a clear title, description, category, and stage via structured outputs. Everything stays editable; the AI also offers one gentle tip on what detail would strengthen the post. Suggestive, never blocking.
- **During:** privately nudge stalling projects with one small concrete next step. Coach, not judge.
- **Off-ramp:** for projects that don't take off, offer a smaller version or redirect the person into a nearby active project. Never label failure.
- **Success metric:** human joins, contributions, and acknowledgments happening — NOT agent interaction volume. The agent is scaffolding that fades.

### 3.10 Recognition and progression — `P1`

*(badges + personal impact score first; progression and quests post-MVP)*

A game-like layer for motivation and progress. **Governing rule: reward only what is acknowledged by others**, so every mechanic inherits the system's built-in anti-gaming protection. Recognition arrives *after* genuine contribution — it honors what was done, it never baits people into doing it.

**Badges — evidence, not trophies**

- Certify real, attested achievements (e.g. "Helped 5 community projects reach completion," "Trusted on grant-writing by 8 neighbors," "Showed up to 10 events").
- Every badge maps to attested contributions — never to activity volume or app usage. No "logged in 30 days" badges.
- Function as a résumé of deeds, confirmed by people.

**Personal impact score — private and weighted**

- A numeric signal of progress, accrued ONLY from attested contributions.
- Impact-weighted: one well-timed contribution that unblocked a stuck project outweighs many trivial ones.
- Primarily private — a personal sense of progress, like a fitness streak. Never a public ranking of neighbors.

**Progression — trust, not cosmetics**

- Advancement unlocks responsibility, not vanity levels: trusted users can attest others' contributions, mentor newcomers, or help steward a project.
- The reward for helping is being trusted to help more — progression compounds the mission.

**Gentle quests — invitational, never punitive**

- Soft prompts toward joining nearby ("3 projects near you could use a hand this week").
- No breakable streaks, no guilt for absence. Same asymmetry as event RSVPs: upside for showing up, no penalty for life getting in the way.

**Collective recognition — celebrate work, not rank people**

- Any leaderboard impulse points at projects ("most active projects this month") or the neighborhood collectively ("our neighborhood completed 40 projects this year").
- Never a ranked list of individuals.

**Explicit non-goals (anti-patterns — do not reintroduce under engagement pressure)**

- No public leaderboard ranking individuals — makes worth zero-sum and shames the bottom.
- No badges or points dangled as bait — recognition follows contribution, never precedes it.
- No activity-volume rewards — nothing rewards logins, posts, or comments detached from acknowledged help.
- No punitive streaks — nothing penalizes absence or breaks a chain.

> **The test for any game mechanic:** does it reward being acknowledged for real help, or does it reward activity for its own sake? Only the former ships.

## 4. Technical architecture

### 4.1 Stack rationale

Web-first to prove the loop fast with existing Supabase/React expertise; mobile follows once the human behavior is understood.

| Layer | Choice and reason |
|---|---|
| **Web client (today)** | Next.js 16 (App Router) + React 19 + Tailwind v4 on Vercel — fastest path to a live, iterable MVP. |
| **Mobile client (later)** | React Native + Expo — managed builds, OTA updates, push, camera, and location out of the box. |
| **Backend / DB** | Supabase Postgres — Row-Level Security enforces membership rules, scoping, and anti-tamper. |
| **Geo (later)** | PostGIS extension — location-radius queries for hyperlocal feed, projects, and offers. |
| **Realtime (later)** | Supabase Realtime — powers "What's happening?" and live project updates. |
| **Auth** | Supabase Auth — email/magic-link today, phone later; identity tied to a verified neighborhood. |
| **Storage (later)** | Supabase Storage — project/event/offer photos. |
| **Trust logic (later)** | Server-side only (Edge Functions / route handlers) — acknowledgment, attestation, and reputation. This is the anti-gaming boundary. |
| **AI agent** | Claude API (`claude-opus-4-8`, structured outputs) via a Next.js route handler — idea shaping today; nudges later, learning from acknowledgment data. |
| **Push (later)** | Expo Notifications — stars received, join requests, contribution acknowledged, event reminders. |

### 4.2 Critical architectural rules

- **Trust-sensitive logic is server-only.** Membership approval, acknowledgment, attestation, and reputation never run in the client or in raw client-writable SQL. RLS is the backstop today; Edge Functions take over as the trust layer grows.
- **No self-approval, no self-crediting, enforced in the database.** A user cannot accept their own join request (live, via RLS) and can never insert an accepted/attested record for their own contribution (planned).
- **Neighborhood is a hard boundary** *(when neighborhoods ship)*. RLS scopes reads/writes to a user's verified neighborhood(s).
- **Failure is invisible.** There is no "failed" state exposed in any API response or UI.

### 4.3 Core data model (sketch)

See [DATA_MODEL.md](DATA_MODEL.md) for detail and implementation status.

- **profiles** — one per auth user; display name. *(live)*
- **projects** — founder, title, description, category, state, timestamps. *(live)*
- **stars** — project_id, user_id (unique pair). *(live)*
- **memberships** — project_id, user_id, status (`pending`/`accepted`); the join flow. *(live)*
- **neighborhoods** — geo boundary (PostGIS), membership. *(planned)*
- **contributions** — project_id, contributor_id, type, description, status (`logged`/`accepted`/`confirmed`), accepted_at, confirmed_at. *(live)*
- **attestations** — contribution_id, attester_id (must ≠ contributor and ≠ founder), timestamp. *(live)*
- **events / rsvps / offers** — physical coordination and non-monetary sharing. *(planned)*
- **reputation (derived)** — computed from attested contributions; never directly writable. *(planned)*

## 5. MVP scope and sequencing

> "As impactful as Facebook" is an outcome, not a starting strategy. Win one neighborhood completely, then template it.

**Phase 0 — One neighborhood pilot (MVP)**

- P0 features: Projects ✅, Stars ✅, Memberships ✅, AI idea shaping ✅, Contributions + acknowledgment ✅, Events, What's happening (basic ✅).
- Single neighborhood, single project category to start (the one where joining is most natural — likely community/practical projects).
- Manual ops acceptable: prove the human loop by hand before automating.

**Phase 1 — Deepen**

- Reputation/skills, Offer/give/lend, AI nudging and off-ramps.
- Expand to additional project categories within the same neighborhood.

**Phase 2 — Template and expand**

- Replicate the proven playbook to the next neighborhoods.
- Revisit monetization deliberately — only models where the user, not a sponsor, is the customer.

See [ROADMAP.md](ROADMAP.md) for the full sequencing.

## 6. Success metrics

Metrics deliberately measure mattering, not engagement.

- **North star:** number of attested contributions per active user per month.
- Share of projects that receive at least one join request within 14 days.
- Share of stargazers who convert to joiners, and joiners to acknowledged contributors.
- Share of newcomers whose first action is a star, join, or event RSVP (on-ramp health).
- **Anti-metric (watch and minimize):** AI agent interactions per human join/contribution — rising means the agent is replacing connection, not enabling it.

## 7. Risks and open questions

- **The unit problem.** Defining a contribution that is real and attributable without becoming gameable is the central design challenge. *Mitigation:* the new-state test + mandatory co-attestation.
- **Local cold-start.** Thousands of tiny networks, each useless until dense. *Mitigation:* one neighborhood, won completely, by hand.
- **Acknowledgment bottleneck.** Flaky founders. *Mitigation:* community attestation routes around them; joining is already self-serve up to approval.
- **Public failure harming the lost.** *Mitigation:* no failed state; graceful archive and redirect.
- **Monetization drift.** The easy path (marketplace, ads, sponsors) is how these products betray their users. *Mitigation:* deferred deliberately; user must remain the customer.

> The mission is to restore the feeling of mattering — to make sure the people around you know you are needed, and you know it too. Every scope decision serves that or is cut.
