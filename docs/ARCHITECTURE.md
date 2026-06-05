# Peoplearound — Architecture

*Derived from the PRD technical sections · Draft v1*

This document describes the system architecture for the Peoplearound MVP. It expands on [PRD §4](PRD.md#4-technical-architecture) and should be read alongside the [Data Model](DATA_MODEL.md).

## Design philosophy

The architecture exists to protect one thing: a **trustworthy record of what people actually did for each other**. Every technical decision below serves the anti-gaming boundary — the rule that worth is acknowledged by others, never self-declared. If a choice would let a user manufacture their own credit, it is wrong by definition.

## Stack overview

| Layer | Technology | Role |
|---|---|---|
| Mobile client | React Native + Expo | iOS/Android app; managed builds, OTA updates, push, camera, location |
| Backend / DB | Supabase Postgres | System of record; Row-Level Security enforces scoping and anti-tamper |
| Geo | PostGIS | Location-radius queries for hyperlocal feed, goals, offers |
| Realtime | Supabase Realtime | "What's happening?" feed and live goal updates |
| Auth | Supabase Auth | Phone/email identity tied to a verified neighborhood |
| Storage | Supabase Storage | Goal / event / offer photos |
| Trust logic | Supabase Edge Functions (Deno/TS) | Acknowledgment, attestation, reputation — server-side only |
| AI agent | Edge Function → LLM API | Goal-shaping, nudges; learns from acknowledgment data |
| Push | Expo Notifications | Stars received, contribution acknowledged, event reminders, nudges |

## Component view

```
┌─────────────────────────────────────────────┐
│           React Native + Expo client         │
│  Around · Goals · Create · Offers · Me       │
└───────────────┬──────────────────┬───────────┘
                │ realtime          │ RPC / writes
                │ subscribe         │
        ┌───────▼───────┐   ┌───────▼─────────────────┐
        │ Supabase       │   │ Edge Functions (Deno/TS) │
        │ Realtime       │   │  • accept contribution   │
        └───────┬───────┘   │  • attest contribution   │
                │           │  • compute reputation    │
                │           │  • AI agent (LLM calls)  │
                │           └───────┬─────────────────┘
                │                   │ privileged writes
        ┌───────▼───────────────────▼─────────────────┐
        │        Postgres + PostGIS (RLS on)           │
        │  users · neighborhoods · goals · stars ·     │
        │  contributions · attestations · events ·     │
        │  offers · reputation (derived)               │
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

Acknowledgment, attestation, and reputation **never** run in the client or in raw client-writable SQL. They live in Edge Functions, with RLS as a backstop. The client may *request* an accept or attest, but the state transition and all validation happen server-side.

### 2. No self-crediting, enforced in the database

A user can never insert an `accepted`/`attested` record for their own contribution. This is enforced at the database level (constraints + RLS), not merely in application code. An attester's identity must differ from the contributor's.

### 3. Neighborhood is a hard boundary

RLS scopes reads and writes to a user's verified neighborhood(s). There is no global social graph. A user cannot see, star, or contribute to goals outside their verified neighborhood.

### 4. Failure is invisible

There is no "failed" state exposed in any API response or UI. Goals move `idea → active → completed`, or are quietly `archived`. No endpoint returns a failure flag; the off-ramp is handled by the AI agent, gently.

## Contribution & attestation flow

The trust core, expressed as a state machine:

```
logged ──(owner accepts)──> accepted ──(≥1 co-attestation)──> confirmed
   │                                                              ▲
   └──(owner unresponsive past window)──> community attestation ──┘
```

- **logged** — contributor records a contribution; owner is notified.
- **accepted** — owner confirms it landed (cannot be the contributor).
- **confirmed** — at least one co-participant or witnessing stargazer attests. Only confirmed contributions count toward reputation and trigger the acknowledgment moment.
- **Owner bypass** — if the owner does not act within a defined window, community attestation alone can move a contribution to `confirmed`, so credit routes around a flaky owner.
- **Leaving** — a contributor may leave at any time (`left_at` set); previously `confirmed` contributions are retained with no penalty.

The **"merged commit" test** is enforced semantically: a contribution should correspond to the goal moving to a new state. This is a product rule reinforced by the acceptance step rather than something the system can fully verify automatically — see the *unit problem* in [PRD §7](PRD.md#7-risks-and-open-questions).

## Reputation pipeline

Reputation is **derived, never directly writable**. It is computed (in Edge Functions / scheduled jobs) from `confirmed` contributions and their attestations:

- Impact-weighted, not volume-counted — a contribution that unblocked a stalled goal outweighs many trivial ones.
- Contextual — surfaced as "trusted on X in this neighborhood," only where relevant.
- Private by default — each user sees their own history; **no public individual leaderboard** exists at any layer.

## AI agent

The agent runs as an Edge Function calling an LLM API. It has three jobs (goal-shaping at MVP; nudging and off-ramp later) and one hard constraint: its success metric is **human** contributions and acknowledgments, not agent interactions. The acknowledgment ledger doubles as the agent's training signal — one mechanism serves both the acknowledgment problem and the failure problem.

The agent is architecturally and visually secondary. If usage data shows agent interactions rising relative to human contributions (the anti-metric in [PRD §6](PRD.md#6-success-metrics)), that is treated as a regression.

## Security & privacy posture

- Identity is tied to a verified neighborhood; auth via Supabase Auth (phone/email).
- RLS is the primary enforcement layer for scoping and anti-tamper, with Edge Functions holding privileged write paths.
- No monetization data paths exist in MVP (no marketplace, no checkout, no advertiser pipelines).
- Photos and user content live in Supabase Storage, access-scoped to neighborhood.
