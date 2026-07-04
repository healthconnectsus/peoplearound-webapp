-- Peoplearound — 0002 rename goals → projects
-- Product pivot: the central object is no longer a personal "goal you want help
-- with" but a shared "idea/project neighbors can JOIN and build together".
-- This migration renames the table, enum, indexes, trigger and policies in
-- place (data is preserved). Guarded so it is safe to re-run.

-- ------------------------------------------------------------------
-- Rename the enum type goal_state → project_state
-- ------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_type where typname = 'goal_state')
     and not exists (select 1 from pg_type where typname = 'project_state') then
    alter type public.goal_state rename to project_state;
  end if;
end
$$;

-- ------------------------------------------------------------------
-- Rename the table goals → projects
-- ------------------------------------------------------------------
do $$
begin
  if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'goals'
     )
     and not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'projects'
     ) then
    alter table public.goals rename to projects;
  end if;
end
$$;

-- ------------------------------------------------------------------
-- Rename constraints goals_* → projects_*. The FK rename matters beyond
-- cosmetics: PostgREST disambiguates embeds by constraint name, and the app
-- selects `owner:profiles!projects_owner_id_fkey(...)`.
-- ------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'goals_pkey') then
    alter table public.projects rename constraint goals_pkey to projects_pkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'goals_owner_id_fkey') then
    alter table public.projects
      rename constraint goals_owner_id_fkey to projects_owner_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'goals_title_check') then
    alter table public.projects
      rename constraint goals_title_check to projects_title_check;
  end if;
  if exists (select 1 from pg_constraint where conname = 'goals_description_check') then
    alter table public.projects
      rename constraint goals_description_check to projects_description_check;
  end if;
end
$$;

-- ------------------------------------------------------------------
-- Rename indexes goals_* → projects_*
-- ------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_class where relname = 'goals_owner_id_idx') then
    alter index public.goals_owner_id_idx rename to projects_owner_id_idx;
  end if;
  if exists (select 1 from pg_class where relname = 'goals_state_idx') then
    alter index public.goals_state_idx rename to projects_state_idx;
  end if;
  if exists (select 1 from pg_class where relname = 'goals_created_at_idx') then
    alter index public.goals_created_at_idx rename to projects_created_at_idx;
  end if;
end
$$;

-- ------------------------------------------------------------------
-- Rename the updated_at trigger
-- ------------------------------------------------------------------
do $$
begin
  if exists (
        select 1 from pg_trigger
        where tgname = 'goals_touch_updated_at' and not tgisinternal
     ) then
    alter trigger goals_touch_updated_at on public.projects
      rename to projects_touch_updated_at;
  end if;
end
$$;

-- ------------------------------------------------------------------
-- Re-create the RLS policies with project-oriented names. Policies followed
-- the table through the rename, so drop the old *and* new names first to make
-- this idempotent.
-- ------------------------------------------------------------------
drop policy if exists "goals readable by authenticated" on public.projects;
drop policy if exists "projects readable by authenticated" on public.projects;
create policy "projects readable by authenticated"
  on public.projects for select to authenticated using (true);

drop policy if exists "users create own goals" on public.projects;
drop policy if exists "users create own projects" on public.projects;
create policy "users create own projects"
  on public.projects for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "owners update own goals" on public.projects;
drop policy if exists "owners update own projects" on public.projects;
create policy "owners update own projects"
  on public.projects for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owners delete own goals" on public.projects;
drop policy if exists "owners delete own projects" on public.projects;
create policy "owners delete own projects"
  on public.projects for delete to authenticated using (auth.uid() = owner_id);
