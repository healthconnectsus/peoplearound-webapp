-- Peoplearound — 0008 help kind + project reach
-- Two new questions a founder answers when sharing an idea:
--   • help  — what kind of help they need: hands nearby ('local'), online
--             help from anywhere ('remote'), or 'both'.
--   • reach — who can see and join: the 'neighborhood' (default — local
--             remains the soul of the product), the 'city', or 'global'.
-- Reach is enforced in RLS: neighborhood stays the hard default boundary;
-- wider reach is a deliberate per-project opt-in, and city reach works via
-- a city label on neighborhoods (operators set it: e.g.
--   update neighborhoods set city = 'Springfield' where name = 'Oak Street';
-- neighborhoods with no city never match city-reach projects).
-- Idempotent.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'help_kind') then
    create type public.help_kind as enum ('local', 'remote', 'both');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_reach') then
    create type public.project_reach as enum ('neighborhood', 'city', 'global');
  end if;
end
$$;

alter table public.neighborhoods
  add column if not exists city text check (city is null or char_length(city) between 1 and 80);

alter table public.projects
  add column if not exists help public.help_kind not null default 'local';
alter table public.projects
  add column if not exists reach public.project_reach not null default 'neighborhood';

create index if not exists projects_reach_idx on public.projects (reach);
create index if not exists neighborhoods_city_idx on public.neighborhoods (city);

-- ------------------------------------------------------------------
-- Visibility: neighborhood first, wider reach by explicit opt-in.
--   own project        → always visible to the founder
--   reach=neighborhood → viewer's neighborhood matches (the default)
--   reach=city         → viewer's neighborhood shares the project's city
--   reach=global       → visible to any signed-in user
-- Child tables (stars, memberships, contributions, attestations, events,
-- rsvps) inherit automatically — their policies check project visibility.
-- ------------------------------------------------------------------
drop policy if exists "projects readable by authenticated" on public.projects;
create policy "projects readable by authenticated"
  on public.projects for select to authenticated
  using (
    owner_id = auth.uid()
    or reach = 'global'
    or neighborhood_id = (
      select neighborhood_id from public.profiles where id = auth.uid()
    )
    or (
      reach = 'city'
      and exists (
        select 1
        from public.profiles pr
        join public.neighborhoods mine on mine.id = pr.neighborhood_id
        join public.neighborhoods theirs on theirs.id = projects.neighborhood_id
        where pr.id = auth.uid()
          and mine.city is not null
          and theirs.city = mine.city
      )
    )
  );
