-- Peoplearound — 0055 imported listings keep their tags
--
-- Local calendars label what they publish, and the labels are the useful part:
-- kcparks.org's feed marks events "Nature", "Educational", "Public Meeting",
-- "Arts/Culture", "Health and Fitness", and visitkc.com shows "Free Events",
-- "Special Events", "Sports" on each page. That is exactly the information a
-- neighbor scanning a list needs — a public meeting and a concert are not the
-- same errand — and we were throwing all of it away at import.
--
-- Two sources, two shapes. iCal states them outright in its CATEGORIES
-- property. A web page usually does not put them in its structured data at
-- all; it renders them as links to its own category pages, which is where the
-- crawler now reads them from.
--
-- Empty array rather than null: a listing with no tags has no tags, and code
-- that maps over the column should never have to check for the absence of a
-- list first.
--
-- Idempotent.

alter table public.city_events
  add column if not exists tags text[] not null default '{}';

comment on column public.city_events.tags is
  'Labels the source itself applied (iCal CATEGORIES, or the category links on an event page). Never inferred by us.';
