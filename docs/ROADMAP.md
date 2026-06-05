# Peoplearound — Roadmap

*Derived from PRD MVP scope, sequencing, metrics, and risks · Draft v1*

> "As impactful as Facebook" is an outcome, not a starting strategy. Win one neighborhood completely, then template it.

The sequencing principle: **prove the human loop by hand before building much software.** Software built before you understand the human behavior tends to fail.

## Phase 0 — One neighborhood pilot (MVP)

The goal of this phase is to prove the contribution loop works in a single neighborhood, in a single goal category.

**Ships (P0 features):**

- [Goals](PRD.md#31-goals-living-pages--p0) — living pages with `idea → active → completed` lifecycle
- [Stars](PRD.md#32-stars--p0) — the isolation-defeating signal
- [Contributions + acknowledgment](PRD.md#33-contributions-and-acknowledgment--p0) — the trust core, with co-attestation
- [Events](PRD.md#35-events--p0) — physical coordination, gentlest on-ramp
- ["What's happening?" feed](PRD.md#36-whats-happening-feed--p0) — realtime discovery
- [Basic AI goal-shaping](PRD.md#38-ai-agent-the-gardener--p1) — shaping vague goals at creation

**Scope decisions:**

- Single neighborhood, single goal category — the one where contribution is most natural (likely community/practical projects).
- **Manual ops acceptable** — prove the loop by hand before automating.

**Exit criteria:** the loop runs end to end without hand-holding — goals attract stars, stars convert to acknowledged contributions, and at least one goal reaches completion through real, co-attested help.

## Phase 1 — Deepen

Enrich the proven loop and broaden within the same neighborhood.

- [Reputation & skills](PRD.md#34-reputation-and-skills--p1) — auto-assembled from acknowledged contributions
- [Offer / give / lend](PRD.md#37-offer--give--lend--p1) — non-monetary resource sharing that feeds contributions
- [AI nudging & off-ramps](PRD.md#38-ai-agent-the-gardener--p1) — stall nudges and dignified redirection
- [Recognition layer](PRD.md#39-recognition-and-progression--p1) — badges + private personal impact score first
- Expand to additional goal categories within the same neighborhood

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
| Share of goals with ≥1 acknowledged contribution within 14 days | Loop health |
| Share of stargazers who convert to contributors | Funnel health |
| Share of newcomers whose first action is at an event or offer | On-ramp health |
| AI agent interactions per human contribution | **Anti-metric** (minimize) |

A rising anti-metric means the agent is replacing connection rather than enabling it — treat as a regression.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| **The unit problem** — a real, attributable contribution that isn't gameable | New-state ("merged commit") test + mandatory co-attestation |
| **Local cold-start** — thousands of tiny networks, each useless until dense | One neighborhood, won completely, by hand |
| **Acknowledgment bottleneck** — flaky owners | Community attestation routes around them |
| **Public failure harming the lost** | No `failed` state; graceful archive and redirect |
| **Monetization drift** — the easy path betrays users | Deferred deliberately; the user must remain the customer |

## Guardrails (every phase)

These do not get relaxed under engagement pressure — see [UX anti-patterns](UX_SPEC.md#6-ux-anti-patterns-do-not-build):

- No public leaderboard ranking individuals.
- No badges/points as bait — recognition follows contribution.
- No activity-volume rewards, no punitive streaks.
- No screen that displays or implies a goal "failed."
- No cash marketplace or checkout.
- No AI agent prominent enough to replace human connection.

> The mission is to restore the feeling of mattering. Every scope decision serves that, or it is cut.
