-- Peoplearound — 0058 seeded demo places stop appearing on the public pages
--
-- The pages readable without an account — `/login` (which is where every
-- logged-out visit lands), `/city`, `/city/<slug>`, and the sitemap that
-- lists them — are fed by the anon-safe views from 0043 and 0012. Those
-- views count every neighborhood in the database.
--
-- That includes the ones `scripts/demo-seed-large.sql` invents: Riverside in
-- Springfield, Old Town in Shelbyville, and a stray "My neighborhood", with
-- their seeded projects and seeded residents. The effects were visible to
-- anyone, signed in or not:
--
--   * `/city` sorts busiest-first, so the top two entries were "Springfield ·
--     20 projects · 67 neighbors" and "Shelbyville · 10 projects · 33
--     neighbors" — above Boulder and Kansas City, which are real places with
--     real imported events and showed zero.
--   * both were in `sitemap.xml`, submitted to search engines.
--   * `/login` shows a live tally from `public_pulse`: 35 projects, 8
--     communities, 221 neighbors — most of which are seed rows.
--
-- Publishing invented community statistics is not a cosmetic problem. A
-- reporter or a council officer could cite them, and the whole value of the
-- city pages is that a stranger can trust what they say. So: a place is
-- either real or it is demonstration furniture, a column says which, and
-- only real ones reach a page that does not require an account.
--
-- Nothing changes while signed in — demo places stay fully usable, which is
-- what they are for.
--
-- Idempotent.

alter table public.neighborhoods
  add column if not exists is_demo boolean not null default false;

comment on column public.neighborhoods.is_demo is
  'Seeded demonstration place, not a real community. Excluded from every view readable without an account: public_cities, public_city_categories, public_city_ideas, public_ideas, public_pulse.';

-- The two cities the demo seed invents, by name — matching on id would not
-- survive a re-seed, which generates fresh ones.
update public.neighborhoods
   set is_demo = true
 where city in ('Springfield', 'Shelbyville')
   and is_demo is distinct from true;

/* Every view below keeps the exact column list it had, so `create or replace`
   preserves the grants made when it was first created. */

create or replace view public.public_cities as
  select
    n.city,
    public.city_slug(n.city) as slug,
    count(distinct n.id)::integer as communities,
    (select count(*)::integer
       from public.projects p
       join public.neighborhoods n2 on n2.id = p.neighborhood_id
      where n2.city = n.city
        and not n2.is_demo
        and p.state <> 'archived'::project_state) as projects,
    (select count(*)::integer
       from public.profiles pr
       join public.neighborhoods n3 on n3.id = pr.neighborhood_id
      where n3.city = n.city
        and not n3.is_demo) as neighbors
  from public.neighborhoods n
 where n.city is not null
   and n.city <> ''
   and not n.is_demo
 group by n.city;

create or replace view public.public_city_categories as
  select
    n.city,
    public.city_slug(n.city) as slug,
    p.category,
    count(*)::integer as projects
  from public.projects p
  join public.neighborhoods n on n.id = p.neighborhood_id
 where p.state <> 'archived'::project_state
   and n.city is not null
   and n.city <> ''
   and not n.is_demo
 group by n.city, p.category;

create or replace view public.public_city_ideas as
  select
    public.city_slug(n.city) as slug,
    p.id,
    p.title,
    p.category,
    p.state,
    p.created_at
  from public.projects p
  join public.neighborhoods n on n.id = p.neighborhood_id
 where p.state <> 'archived'::project_state
   and p.reach = 'global'::project_reach
   and n.city is not null
   and n.city <> ''
   and not n.is_demo
 order by p.created_at desc;

-- A project with no neighborhood yet is still somebody's real project, so it
-- stays; only ones anchored to a demo place are removed.
create or replace view public.public_ideas as
  select
    p.id,
    p.title,
    p.category,
    p.state,
    p.created_at,
    (select count(*)::integer from public.stars s where s.project_id = p.id)
      as star_count
  from public.projects p
 where p.state <> 'archived'::project_state
   and p.reach = 'global'::project_reach
   and not exists (
     select 1 from public.neighborhoods n
      where n.id = p.neighborhood_id and n.is_demo
   )
 order by p.created_at desc
 limit 60;

-- The tally on the front page. Same rule: a real person who has not picked a
-- neighborhood yet is still a neighbor; a seeded one is not.
create or replace view public.public_pulse as
  select
    (select count(*)::integer
       from public.projects p
      where p.state <> 'archived'::project_state
        and not exists (
          select 1 from public.neighborhoods n
           where n.id = p.neighborhood_id and n.is_demo
        )) as projects,
    (select count(*)::integer
       from public.neighborhoods n
      where not n.is_demo) as communities,
    (select count(*)::integer
       from public.profiles pr
      where not exists (
        select 1 from public.neighborhoods n
         where n.id = pr.neighborhood_id and n.is_demo
      )) as neighbors;
