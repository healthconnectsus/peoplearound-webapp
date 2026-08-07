# Peoplearound — Business Development

*How this becomes a business. Revenue streams ranked by fit, when to turn each
one on, and what it takes to break even. Started 2026-08-06. Cost side lives in
[SCALING.md](SCALING.md); go-to-market lives in [MARKETING.md](MARKETING.md).*

**The one-line thesis:** infrastructure costs under one cent per registered
user per month at scale, so Peoplearound doesn't need aggressive monetization —
it needs *dense neighborhoods first*, then any two of the streams below cover
the bills many times over.

---

## Unit economics (from SCALING.md)

| Scale | Infra cost / month | Cost per registered user |
|---|---|---|
| 10k users | ~$70–130 | ~$1.0¢ |
| 100k users | ~$600–1,200 | ~0.9¢ |
| 1M users | ~$3.5–5.5k (optimized) | ~0.4–0.6¢ |

Any ARPU above ~1¢/month is profitable on infrastructure. The real costs that
scale with users are **moderation and support** (people, not servers) — budget
for them from ~100k users onward.

---

## 1. Revenue streams, ranked by fit

### 1a. Local business layer — the proven model

What Nextdoor built a public company on: geography is the one targeting
dimension local businesses will actually pay for.

- **Business profiles** — a claimed page for the café, gym, or hardware store,
  visible in its neighborhood. Free to claim (density first), paid to promote.
- **Sponsored placement** — a clearly-labeled pinned card in the neighborhood
  feed and events list. Self-serve, $10–50/post or $20–100/mo per business.
- **Local event promotion** — businesses hosting or sponsoring neighborhood
  events (the sports wedge in MARKETING.md feeds this directly: courts,
  breweries, gear shops all want to reach the crews that play near them).

Revenue shape: 500 paying businesses × $50/mo ≈ **$25k/mo** at 1M-user scale.
Only sells where neighborhoods are dense — pilot in the top 10 most active
neighborhoods before building any self-serve tooling.

### 1b. Peoplearound Plus — premium for organizers

The ingredients already exist in the product: view trends (migration 0022),
badges, reach settings, AI shaping with a daily cap. Organizers are the 1–3%
who get outsized value and will pay $3–8/mo for:

- Wider reach radius and more concurrent active projects
- Pinned placement for their project in the neighborhood
- Richer analytics (who viewed, joined, contributed — trends over time)
- Higher AI-shaping limits, profile flair / supporter badge

Revenue shape: 1–2% of MAU convert. At 400k MAU × 1.5% × $5 ≈ **$30k/mo**.
The supporter badge doubles as a goodwill lever: early adopters pay to keep
the lights on, publicly credited.

### 1c. Transaction fees on activity

Monetize what the app is *for* — neighbors doing things together — rather than
attention:

- **Paid event tickets** (classes, tournaments, workshops): 3–5% + Stripe
  processing via Stripe Connect.
- **Project contributions / fundraising** ("chip in for the new nets"): same
  rails, same fee.

Revenue scales with community health, not ad load, so it strengthens trust
instead of eroding it. Modest at first (most neighborhood activity is free)
but compounds with the sports wedge, where leagues and courts have real fees.

### 1d. B2B / B2G — organizations pay for community

Municipalities, housing associations, sports associations, and NGOs all have
budgets for "community engagement" and terrible tools for it:

- Branded community spaces with their own moderation and boundaries
- Engagement dashboards (what are residents organizing, joining, asking for)
- Moderation and safety tooling, priority support

Price $100–1,000/mo per org. Often the steadiest early revenue for
civic-flavored apps — it can start at 10–100k users, *before* consumer revenue
works, and the association partnerships in MARKETING.md are the pipeline.

### 1e. Generic display ads — avoid

Third-party ad networks poison a trust-based neighbor app for pennies. If it
ever says "sponsored," it should be a named local business a neighbor could
walk into. No programmatic, no data resale, ever — that promise is itself a
marketing asset.

---

## 2. Sequencing

| Stage | Focus | Monetization |
|---|---|---|
| **0 → 10k** | Density in a handful of neighborhoods; sports wedge | **None.** Infra is ~$100/mo; charging now would slow the only thing that matters |
| **10k → 100k** | Repeatable neighborhood playbook | Pilot B2B with 2–3 associations/municipalities; optional "supporter" badge (voluntary Plus precursor) |
| **100k → 1M** | Dense metros | Launch Plus; business profiles free-to-claim, paid promotion in the densest neighborhoods; ticketing fees via the sports wedge |
| **1M+** | Multi-metro / international | All four streams; self-serve business tooling; B2G expansion |

## 3. Break-even math

Optimized infrastructure at 1M users is ~$4–5k/mo. That is covered *entirely* by
**any one** of:

- ~1,000 Plus subscribers ($5/mo) — 0.25% of MAU
- ~100 business accounts ($50/mo)
- ~8 B2B/B2G contracts ($500/mo)

Everything past the first stream is margin (minus people costs). The break-even
bar is low enough that monetization design should optimize for *trust
preservation*, not extraction.

## 4. Guardrails

1. **Never monetize reach between neighbors.** Boosting a business is fine;
   making a resident pay to be heard by their own neighborhood kills the
   product's reason to exist.
2. **Labeled, local, walkable.** Every paid placement is marked, from a real
   local entity, relevant to the neighborhood it appears in.
3. **Free tier stays fully functional.** Plus adds power for organizers; it
   never gates core participation (joining, chatting, RSVPing, posting).
4. **People costs before growth costs.** Moderation at scale is the largest
   real expense and the largest trust risk — staff it ahead of need.
