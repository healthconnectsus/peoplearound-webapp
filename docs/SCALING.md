# Peoplearound — Scaling & Cost

*What this costs to run, where it breaks first, and what we've already done
about it. Assumes registered → ~50% MAU, ~20% of MAU daily, peak concurrent
≈ 5–8% of DAU (1M registered ≈ 400k MAU ≈ 90k DAU ≈ ~10k concurrent).*

## Where the money goes

| Monthly | 10k users | 100k users | 1M users |
|---|---|---|---|
| Supabase plan + compute | $25 + $10–15 | $25 + $60–110 | $25 + $400–800 |
| Supabase auth MAU | $0 | $0 | ~$975 |
| Storage + egress (photos) | ~$5 | $250–450 | $2–4k raw → **~$300 optimized** |
| Realtime | $0 | $50–150 | $300–800 |
| Vercel | $20–25 | $100–250 | $1.5–3k |
| Map tiles | $0–20 | $100–250 | $250–1,500 (or ~$100 self-hosted) |
| Email (Resend) | $0–20 | $20 | $35–90 |
| AI shaping | <$1 | ~$2 | $10–50 |
| **Total** | **~$70–130** | **~$600–1,200** | **~$5–9k as-built / ~$3.5–5.5k optimized** |

Under one cent per registered user per month at scale.

## The four levers (all addressed 2026-08)

### 1. Realtime — the first *wall*, not just a cost ✅ mitigated

`LiveRefresh` used to subscribe every open page to `postgres_changes` on up
to 7 unfiltered tables and call `router.refresh()` on any change: one write
→ a full server re-render **per viewer** (N× Vercel compute + N× DB reads),
and Supabase runs per-subscriber RLS checks that degrade past a few hundred
concurrent subscribers.

Now:
- **Server-side filters** — project pages subscribe with
  `table:project_id=eq.<id>`, chats with `messages:conversation_id=eq.<id>`,
  so Postgres pushes only rows that page cares about.
- **Visibility gating** — subscriptions are dropped when the tab is hidden
  and restored (with a catch-up refresh) on return. Background tabs were the
  bulk of concurrent subscribers.
- **Debounce + floor** — 1.2s debounce and a hard 5s minimum between
  re-renders, so bursts cost one render.
- **Fewer tables on the feed** — the feed watches `projects,events` (rare
  writes) instead of also `stars,memberships` (frequent writes).
- **Escape hatch** — `NEXT_PUBLIC_REALTIME=off` switches to visibility-aware
  60s polling with no code change.
- **RSVPs bump their event** — `rsvps` has no `project_id`, so subscribing to
  it meant every RSVP system-wide reaching every viewer. It was dropped, but
  an RSVP writes only the `rsvps` row, so other viewers' "N going" counts went
  stale. Migration 0024 adds `events.updated_at` and a trigger that touches
  the parent event on RSVP insert/delete, so the existing `events` filter
  fires. (Attestations needed no equivalent: attesting calls
  `reconcile_contributions`, which updates a subscribed `contributions` row.)
- **Delete events still match** — Postgres only replicates the primary key on
  DELETE, so a filter on a non-PK column silently misses deletions. Migration
  0023 sets `REPLICA IDENTITY FULL` on `contributions`, `events`, and
  `project_updates` (low-write tables) so removing one still refreshes other
  viewers. `stars`/`memberships` already carry `project_id` in their PK.

**Accepted tradeoffs:** with a conversation open, chats subscribe only to
that conversation, so other conversations' sidebar previews update on the
next navigation rather than instantly — deliberate, since an unfiltered
`messages` subscription costs a per-subscriber RLS check on every message in
the system. Likewise `NEXT_PUBLIC_*` values are baked at build time, so
switching map providers needs a redeploy, not just an env edit.

**Next threshold (~10–20k MAU):** move to Realtime **Broadcast** (server
publishes one lightweight event; clients patch state) instead of
`postgres_changes`, and stop re-rendering the whole route.

### 2. Images — the biggest raw line ✅ mitigated

Uploads used to go up as 5 MB originals and render full-size.

Now: `shrinkImage()` (src/lib/image.ts) re-encodes in the browser before
upload — max 1600px edge, JPEG q82, EXIF orientation applied (`imageOrientation:
"from-image"`, without which portrait phone photos re-encode sideways),
typically **~10× smaller** — used by both
project photos and profile avatars/covers. Uploads are cached immutably
(unique paths). `thumbUrl()` is ready for Supabase image transformations
behind `NEXT_PUBLIC_IMAGE_TRANSFORM=on` when we're on a plan that includes
them.

**Next threshold:** turn on transformations + `loading="lazy"` on feed
imagery; consider a CDN in front of Storage.

### 3. Map tiles — a free tier with an expiry date ✅ made swappable

`tile.openstreetmap.org` and public Nominatim are free but policy-limited:
fine for a pilot, throttled/blocked for a real user base.

Now: both map components read `NEXT_PUBLIC_MAP_TILE_URL` and
`NEXT_PUBLIC_MAP_ATTRIBUTION`, defaulting to OSM. Moving to Stadia/MapTiler
is an env var, not a deploy-blocking refactor. Geocoding volume stays tiny
(only new-location registration, already DB-capped at 25/day globally).

### 4. AI — a rounding error, by design ✅ kept that way

Auth gate + 20 shapes/user/day (migration 0017) bound it hard; DeepSeek at
~$0.0003/call means a few dollars a month even at 1M users. The Anthropic
fallback now uses **Haiku 4.5** (~$0.002/call) rather than Opus
(~$0.012/call), so an accidental failover doesn't multiply the bill.

## Not in the table

Your time, and — past ~100k users — **moderation and support**, which for a
neighborhood social app eventually costs more than servers. The flag →
review-email pipeline (migration 0019) is the seed of that; an admin console
is the next step (see [FEATURE_IDEAS](FEATURE_IDEAS.md) Tier 1 #7).
