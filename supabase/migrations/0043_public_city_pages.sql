-- Peoplearound — 0043 public city pages
--
-- A read-only "what's being built in Aurora" page for city partners and
-- press (FEATURE_IDEAS Tier 3 §17). The whole design constraint is that it
-- must be publishable to strangers, so it follows the rule 0042 established:
--
--   • counts, never content, for anything scoped to a neighborhood
--   • titles only for projects whose author chose "open to anywhere"
--   • no names, no owners, no locations, no view data — ever
--
-- Both views run security_invoker = off so they can serve anonymous
-- visitors, which is exactly why their columns are chosen so narrowly.
-- Idempotent.

-- A stable, URL-safe key for a free-text city name.
create or replace function public.city_slug(name text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace view public.public_cities
with (security_invoker = off) as
  select
    n.city,
    public.city_slug(n.city) as slug,
    count(distinct n.id)::int as communities,
    (select count(*)::int
       from public.projects p
       join public.neighborhoods n2 on n2.id = p.neighborhood_id
      where n2.city = n.city and p.state <> 'archived') as projects,
    (select count(*)::int
       from public.profiles pr
       join public.neighborhoods n3 on n3.id = pr.neighborhood_id
      where n3.city = n.city) as neighbors
  from public.neighborhoods n
  where n.city is not null and n.city <> ''
  group by n.city;

grant select on public.public_cities to anon, authenticated;

-- What a city is building, in categories — a shape of activity that names
-- nobody. Safe for a partner page or a press screenshot.
create or replace view public.public_city_categories
with (security_invoker = off) as
  select
    n.city,
    public.city_slug(n.city) as slug,
    p.category,
    count(*)::int as projects
  from public.projects p
  join public.neighborhoods n on n.id = p.neighborhood_id
  where p.state <> 'archived'
    and n.city is not null and n.city <> ''
  group by n.city, p.category;

grant select on public.public_city_categories to anon, authenticated;

-- The only projects quoted by name: the ones open to anywhere.
create or replace view public.public_city_ideas
with (security_invoker = off) as
  select
    public.city_slug(n.city) as slug,
    p.id,
    p.title,
    p.category,
    p.state,
    p.created_at
  from public.projects p
  join public.neighborhoods n on n.id = p.neighborhood_id
  where p.state <> 'archived'
    and p.reach = 'global'
    and n.city is not null and n.city <> ''
  order by p.created_at desc;

grant select on public.public_city_ideas to anon, authenticated;
