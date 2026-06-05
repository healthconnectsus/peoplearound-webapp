# Peoplearound — UX Specification

**Achieve goals together.** · *UX Specification · Draft v1*

> Every screen should make a person feel the neighborhood is alive, that they are needed, and that what they did was seen.

## Contents

1. [UX principles](#1-ux-principles)
2. [Navigation and information architecture](#2-navigation-and-information-architecture)
3. [Onboarding flow](#3-onboarding-flow)
4. [Key screens](#4-key-screens)
5. [Tone and visual direction](#5-tone-and-visual-direction)
6. [UX anti-patterns (do not build)](#6-ux-anti-patterns-do-not-build)

---

## 1. UX principles

These principles decide every screen-level tradeoff. When a design choice is unclear, the answer is whichever option better serves these.

- **Presence over performance.** The UI shows what people are doing together, not what they're saying about themselves. No vanity feed, no infinite scroll.
- **Low activation energy.** Every screen offers one obvious small action a lost or hesitant person can take — star, RSVP, offer a tool — before any big commitment.
- **Acknowledgment is the emotional peak.** The single most important moment in the product is a person learning their contribution was confirmed. The UI treats it as the celebration, not a buried notification.
- **Failure is invisible and gentle.** No screen ever displays a goal as failed. Quiet goals are softened, reframed, or redirected.
- **Recognition follows, never baits.** Badges and progress appear after real contribution; they are never dangled to drive activity.
- **Local and calm.** Hyperlocal scope keeps volume low and human. The app should feel like a town square, not a stadium.

## 2. Navigation and information architecture

A mobile-first app with a simple bottom tab bar. Five tabs, each mapping to a core job.

| Tab | Primary content | Job it serves |
|---|---|---|
| **Around** | "What's happening?" realtime feed | "Show me my neighborhood is alive right now." |
| **Goals** | Browse / search local goals | "Find something I care about to support or help." |
| **Create (+)** | New goal / event / offer | "Declare a goal, or offer what I have." |
| **Offers** | Give / lend / offer board | "See what neighbors are sharing; offer my own." |
| **Me** | Your deeds, badges, goals | "See what I've done and what needs me." |

> The **Create** button sits center of the tab bar but is deliberately not the loudest element. We want people to feel they can contribute to others before being pushed to broadcast their own goal.

## 3. Onboarding flow

**Goal:** get a new (possibly lonely or skeptical) person to one small, real action fast — ideally a star or an RSVP, not a goal creation.

1. **Welcome** — one line on what Peoplearound is ("Achieve goals together with the people around you"). No sign-up wall yet.
2. **Locate** — request location to find the user's neighborhood. Explain plainly why (everything here is local).
3. **Verify neighborhood** — confirm the detected neighborhood; this becomes the user's scope.
4. **Auth** — phone or email via Supabase Auth. Kept late so the person sees value first.
5. **First taste** — immediately show the live "Around" feed with 2–3 active local goals and a gentle prompt: "See something you'd be glad existed? Tap the star."

> **First action target:** a star or an RSVP within the first session — never "create your first goal" as the onboarding ask. We lower activation energy, not raise it.

## 4. Key screens

### 4.1 Around (What's happening?)

The home tab. A calm, realtime, location-scoped feed of life nearby.

- Card types: active goal updates, upcoming events, recently acknowledged contributions, new offers.
- Each card has one clear lightweight action (star, RSVP, view, offer help).
- Recently-acknowledged-contribution cards quietly celebrate neighbors ("Maria's garden reached its first planting day — 6 neighbors helped") — modeling the behavior we want.
- No engagement-maximizing infinite scroll; feed is finite and refreshes, valuing calm over time-on-app.

### 4.2 Goal page (living page)

The heart of the product. Persistent, stateful, story-like.

- **Header:** title, owner, current state (idea / active / completed), star count + faces of stargazers.
- **Primary actions:** Star, Contribute, Join event.
- **History timeline:** the accumulating true story of the goal — stars, accepted contributions (with who), events, milestones. This is the screen's emotional core.
- **Contributors strip:** faces of people who helped, each linking to their deeds.
- **Owner-only controls:** accept contributions, create events, update state — visually quiet, not dominating the page.

> The history timeline, not a photo or a like count, is the hero of the goal page. The making is the product.

### 4.3 Contribute flow

How a contributor logs help. Must feel easy yet produce a real, attributable record.

1. Tap **Contribute** on a goal.
2. Choose type: knowledge, resource, skill, time, or presence.
3. Describe briefly what you're offering or did.
4. Submit → status `logged`. The owner is notified to accept.
5. On owner acceptance + one co-attestation → status `confirmed`, and the contributor gets the celebratory acknowledgment moment ([4.4](#44-the-acknowledgment-moment)).
6. A **Leave this goal** option is always available, framed neutrally; prior confirmed contributions are retained.

### 4.4 The acknowledgment moment

The emotional peak of the entire product, and therefore the most carefully designed screen.

- Triggered when a contribution becomes confirmed (owner accepted + co-attested).
- A warm full-screen moment: *"Maria confirmed your help on the Oak Street garden. You were needed — and you showed up."*
- Shows who acknowledged it and adds the deed to the user's permanent record; any badge earned surfaces here, as recognition after the fact.
- Tone is sincere, not gamey — confetti-light. The reward is being seen by a person, not points popping.

### 4.5 Acknowledge / attest flow (owner + community)

How credit gets confirmed without a single point of failure.

- Owner sees pending contributions with a clear **Accept** action.
- Co-participants and stargazers who witnessed a contribution can **Attest** ("Yes, I saw this happen"). Cannot attest your own.
- If the owner is unresponsive past a window, community attestation alone can confirm — the UI surfaces this path so contributors aren't stuck.

### 4.6 Events

- Created from a goal: title, time, place.
- Simple **Join / not** (GroupMe-style). RSVP is coordination only — no count of "no-shows," ever.
- Post-event prompt to the owner: acknowledge who contributed (feeds [4.4](#44-the-acknowledgment-moment)).
- Event cards surface prominently in Around as the easiest on-ramp.

### 4.7 Offers (give / lend / offer)

- A board of things neighbors will give, lend, or offer. No prices, no checkout — there is no money in the product.
- An offer can be attached to a goal, converting it into a contribution there.
- Clear give vs lend vs offer-a-skill labels; simple request/claim interaction.

### 4.8 Me (profile as a record of deeds)

The anti-LinkedIn, anti-Facebook profile. Worth measured in confirmed deeds, not declarations.

- **Header:** name, neighborhood, a one-line auto-assembled summary ("Trusted on community projects; known by 30 neighbors").
- **Deeds timeline:** confirmed contributions with who acknowledged them — the resume of mattering.
- **Badges:** attested milestones, shown as evidence of real help.
- **Personal impact:** a private progress view (own eyes mainly); no comparison to others.
- **My goals:** goals you own, with their states and gentle agent suggestions.

> No public ranking of people appears anywhere in the app. Collective and goal-level recognition is allowed; individual leaderboards are not.

### 4.9 AI agent surfaces

- **At goal creation:** inline suggestions that help shape a vague goal into a contributable one. Suggestive, never blocking.
- **On a stalling goal** (owner-only, private): a gentle card with one concrete next step. Coach tone.
- **Off-ramp:** for a quiet goal, a private, kind prompt offering a smaller version or a nearby active goal to join. Never the word "failed."
- **Visual treatment:** the agent is visibly secondary — small, calm, dismissible. It must feel like scaffolding that fades, not a character the user relates to instead of people.

## 5. Tone and visual direction

- **Mood:** warm, calm, human — a town square at golden hour, not a neon arcade or a corporate network.
- **Palette:** grounded greens and warm neutrals; the deep green accent signals growth and contribution.
- **Faces over avatars-as-brands:** real people, real neighborhood; photography and faces emphasize presence.
- **Restraint with metrics:** numbers are small and quiet; stories and faces are large. We celebrate deeds, not dashboards.
- **Motion:** gentle. The acknowledgment moment is the one place we allow a warm flourish.

## 6. UX anti-patterns (do not build)

- Infinite-scroll engagement feed optimized for time-on-app.
- Public leaderboard ranking individual neighbors.
- Streak counters or guilt mechanics that punish absence.
- Any screen that displays or implies a goal "failed."
- Like/reaction counts presented as the primary signal of worth.
- Badges or rewards dangled before contribution to drive activity.
- A cash marketplace / checkout (offers are non-monetary in MVP).
- An AI agent prominent enough that people relate to it instead of to neighbors.

> If a screen would make a person feel watched, ranked, behind, or like a product being sold — it does not ship, however much it would boost engagement.
