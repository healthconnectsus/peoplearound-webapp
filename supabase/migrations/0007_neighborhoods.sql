-- Peoplearound — 0007 neighborhoods + realtime
-- The hard boundary. Everything a user can see, star, join, or build is
-- scoped to their neighborhood: there is no global social graph. This
-- migration adds PostGIS, the neighborhoods table, neighborhood_id on
-- profiles and projects, neighborhood-scoped RLS across every table
-- (children inherit scope through project visibility), a location →
-- neighborhood lookup, and realtime publication for the live feed.
--
-- Manual-ops notes for the pilot:
--   • A single "My neighborhood" row is seeded (if none exists) and all
--     existing profiles/projects are backfilled to it, so nothing breaks.
--     Rename it:      update neighborhoods set name = 'Oak Street' where name = 'My neighborhood';
--   • Add more:       insert into neighborhoods (name) values ('Riverside');
--   • Draw a boundary (enables 📍 use-my-location detection):
--       update neighborhoods set boundary = ST_GeogFromText('POLYGON((lng lat, ...))') where name = '...';
-- Idempotent.

create extension if not exists postgis with schema extensions;

-- ------------------------------------------------------------------
-- neighborhoods — admin-managed (no client write path at all)
-- ------------------------------------------------------------------
create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  boundary extensions.geography (polygon, 4326),
  created_at timestamptz not null default now()
);

alter table public.neighborhoods enable row level security;

drop policy if exists "neighborhoods readable by authenticated" on public.neighborhoods;
create policy "neighborhoods readable by authenticated"
  on public.neighborhoods for select to authenticated using (true);
-- No insert/update/delete policies: neighborhoods are created by operators,
-- not users. Verification (phone + address) is a later phase.

-- ------------------------------------------------------------------
-- neighborhood_id on profiles and projects
-- ------------------------------------------------------------------
alter table public.profiles
  add column if not exists neighborhood_id uuid references public.neighborhoods (id) on delete set null;
alter table public.projects
  add column if not exists neighborhood_id uuid references public.neighborhoods (id) on delete set null;

create index if not exists profiles_neighborhood_id_idx on public.profiles (neighborhood_id);
create index if not exists projects_neighborhood_id_idx on public.projects (neighborhood_id);

-- Seed one pilot neighborhood if none exists, and backfill everything
-- unassigned to it so existing users and projects keep working.
do $$
declare
  pilot uuid;
begin
  if not exists (select 1 from public.neighborhoods) then
    insert into public.neighborhoods (name) values ('My neighborhood');
  end if;
  select id into pilot from public.neighborhoods order by created_at limit 1;
  update public.profiles set neighborhood_id = pilot where neighborhood_id is null;
  update public.projects set neighborhood_id = pilot where neighborhood_id is null;
end
$$;

-- New projects always inherit the founder's neighborhood — set server-side
-- by trigger, so the client cannot place a project elsewhere.
create or replace function public.set_project_neighborhood()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select neighborhood_id into new.neighborhood_id
  from public.profiles where id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists projects_set_neighborhood on public.projects;
create trigger projects_set_neighborhood
  before insert on public.projects
  for each row execute function public.set_project_neighborhood();

-- ------------------------------------------------------------------
-- Neighborhood-scoped RLS. A project is visible if it is in the viewer's
-- neighborhood (or the viewer founded it — founders never lose their own).
-- Every child table inherits the boundary because its policies check
-- project visibility, and RLS applies inside policy subqueries too.
-- ------------------------------------------------------------------

drop policy if exists "projects readable by authenticated" on public.projects;
create policy "projects readable by authenticated"
  on public.projects for select to authenticated
  using (
    owner_id = auth.uid()
    or neighborhood_id = (
      select neighborhood_id from public.profiles where id = auth.uid()
    )
  );

-- Creating a project requires having picked a neighborhood.
drop policy if exists "users create own projects" on public.projects;
create policy "users create own projects"
  on public.projects for insert to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and neighborhood_id is not null
    )
  );

-- Stars: you can only see/star what you can see.
drop policy if exists "stars readable by authenticated" on public.stars;
create policy "stars readable by authenticated"
  on public.stars for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy if exists "users star as themselves" on public.stars;
create policy "users star as themselves"
  on public.stars for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p where p.id = project_id)
  );

-- Memberships: same inheritance.
drop policy if exists "memberships readable by authenticated" on public.memberships;
create policy "memberships readable by authenticated"
  on public.memberships for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy if exists "users request to join" on public.memberships;
create policy "users request to join"
  on public.memberships for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and exists (select 1 from public.projects p where p.id = project_id)
  );

-- Contributions + attestations: scope reads through the project.
-- (Inserts already require an accepted membership / witness relationship,
-- which is itself scoped, so no insert change is needed.)
drop policy if exists "contributions readable by authenticated" on public.contributions;
create policy "contributions readable by authenticated"
  on public.contributions for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy if exists "attestations readable by authenticated" on public.attestations;
create policy "attestations readable by authenticated"
  on public.attestations for select to authenticated
  using (
    exists (select 1 from public.contributions c where c.id = contribution_id)
  );

-- Events + rsvps: scope reads through the project / event.
drop policy if exists "events readable by authenticated" on public.events;
create policy "events readable by authenticated"
  on public.events for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy if exists "rsvps readable by authenticated" on public.rsvps;
create policy "rsvps readable by authenticated"
  on public.rsvps for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

drop policy if exists "users rsvp as themselves" on public.rsvps;
create policy "users rsvp as themselves"
  on public.rsvps for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.events e where e.id = event_id)
  );

-- ------------------------------------------------------------------
-- Location → neighborhood lookup (used by "📍 Use my location").
-- Only matches neighborhoods that have a drawn boundary.
-- ------------------------------------------------------------------
create or replace function public.find_neighborhood(lat double precision, lng double precision)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select n.id, n.name
  from public.neighborhoods n
  where n.boundary is not null
    and ST_Covers(
      n.boundary,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    )
  order by n.created_at
  limit 1;
$$;

revoke all on function public.find_neighborhood(double precision, double precision) from public;
revoke all on function public.find_neighborhood(double precision, double precision) from anon;
grant execute on function public.find_neighborhood(double precision, double precision) to authenticated;

-- ------------------------------------------------------------------
-- Realtime: publish the tables the live feed and project page watch.
-- RLS still applies — subscribers only receive rows they can select.
-- ------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects', 'stars', 'memberships', 'events', 'rsvps',
    'contributions', 'attestations'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
