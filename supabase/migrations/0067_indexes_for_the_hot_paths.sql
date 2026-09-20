-- Peoplearound — 0067 indexes for the columns the new reads filter on
--
-- Collapsing forty API requests into a handful of functions is only half the
-- job. A function that runs one query instead of nine is not faster if that
-- query is a sequential scan, and several of the predicates these functions
-- lean on had no index at all. Two of them run on *every page load*:
--
--   community_members.user_id   `shell_state` unions your memberships into
--                               the frame. The primary key is
--                               (community_id, user_id), so a lookup by
--                               user alone cannot use it — that is a scan of
--                               the whole membership table, per page view.
--   rsvps.user_id               the same, for the "events" number beside the
--                               rail. Primary key (event_id, user_id), same
--                               problem, same frequency.
--
-- The rest are hit by the functions added over the last few migrations:
--
--   stars.user_id               profile_stars (0063) — pkey is
--                               (project_id, user_id), no good for this.
--   attestations.attester_id    badge_material (0062) — the unique index is
--                               (contribution_id, attester_id), same story.
--   contributions.status        feed_material (0060) and the milestone
--                               counts (0062), both of which want
--                               status = 'confirmed' and a date range.
--   messages.sender_id          the "messages sent" figure on the profile
--                               and analytics pages. No index whatsoever.
--   offers                      `openAsks` wants the newest unclaimed asks
--                               of kind 'need', across communities. The
--                               existing partial index leads with
--                               neighborhood_id, which this query does not
--                               filter on, so it could not be used.
--   city_events                 the public calendars list filters by
--                               provider and date; the existing index leads
--                               with city_id, which is absent when no
--                               community is picked.
--
-- All eight tables are small enough today that every one of these is a fast
-- scan and nobody would notice. That is exactly when to add them: an index
-- created on a table of ninety-nine rows is instant, and the same statement
-- on a table of nine million is an outage.
--
-- Not included, deliberately: three existing indexes are redundant —
-- `stars_project_id_idx`, `rsvps_event_id_idx` and
-- `attestations_contribution_id_idx` each duplicate the leading column of a
-- composite key that already covers them, so each costs a B-tree write per
-- insert and buys nothing. Dropping them is safe but it is a change that
-- can only make queries slower if the reasoning is wrong, so it is left for
-- a waking decision rather than done overnight.
--
-- Idempotent.

-- --- on every page load ------------------------------------------------
create index if not exists community_members_user_idx
  on public.community_members (user_id);

create index if not exists rsvps_user_idx
  on public.rsvps (user_id);

-- --- the profile and badge functions ------------------------------------
create index if not exists stars_user_idx
  on public.stars (user_id);

create index if not exists attestations_attester_idx
  on public.attestations (attester_id);

create index if not exists messages_sender_idx
  on public.messages (sender_id);

-- status alone is two or three distinct values, which an index cannot
-- usefully narrow; paired with the date it answers "confirmed since X"
-- directly, which is what both callers ask.
create index if not exists contributions_status_confirmed_idx
  on public.contributions (status, confirmed_at);

-- --- small help, and the public calendars --------------------------------
-- The newest unclaimed asks, in the order they are read. Partial, so it
-- indexes only the rows that can ever match.
create index if not exists offers_open_asks_idx
  on public.offers (created_at desc)
  where kind = 'need' and claimed_by is null;

create index if not exists city_events_provider_date_idx
  on public.city_events (provider, event_date);
