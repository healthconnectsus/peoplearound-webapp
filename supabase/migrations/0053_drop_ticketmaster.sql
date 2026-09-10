-- Peoplearound — 0053 the ticketing provider is gone
--
-- Ticketmaster was added so a new city would not be empty, and it did that:
-- Kansas City had 319 listings within a minute of being switched on. But
-- what it supplies is ticketed entertainment — touring bands, arena sport,
-- theatre runs — and this is a product about neighbors doing things together.
-- A stadium concert sitting beside "Garden Work Day" is not a neighborhood
-- becoming visible; it is noise wearing the same card.
--
-- Removed at the owner's request, in full rather than merely hidden: the
-- provider code, the API key, and the rows. A feature switched off but left
-- in the schema is a feature that comes back by accident.
--
-- The community calendars stay. Those are the genuinely local ones — parks
-- departments, libraries, city calendars — read from what those bodies
-- already publish, and they carry the `calendar` provider.
--
-- Idempotent.

-- ------------------------------------------------------------------
-- 1. The listings themselves.
-- ------------------------------------------------------------------
delete from public.city_events where provider = 'ticketmaster';

-- ------------------------------------------------------------------
-- 2. Narrow the allowed providers so nothing can write them again.
--    Migration 0049 already widened this constraint once, to add
--    'calendar'; this is the same move in reverse.
-- ------------------------------------------------------------------
alter table public.city_events drop constraint if exists city_events_provider_check;
alter table public.city_events
  add constraint city_events_provider_check
  check (provider in ('serpapi', 'calendar'));
