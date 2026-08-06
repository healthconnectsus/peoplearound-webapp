-- Peoplearound — 0021 project photo uploads + founder updates
-- 1) A public "projects" storage bucket so founders can put a real photo on
--    an idea (faces and places over stock imagery — UX_SPEC §5).
-- 2) project_updates: short founder posts ("we got the permits!") that land
--    in the project's history timeline. This is the calm alternative to
--    comment threads (see docs/FEATURE_IDEAS.md rejected list): only the
--    founder and accepted teammates can post, so it stays a build log, not
--    a like-economy surface.
-- Idempotent.

-- ============================================================
-- storage: public "projects" bucket, own-folder writes
-- ============================================================
insert into storage.buckets (id, name, public)
values ('projects', 'projects', true)
on conflict (id) do nothing;

drop policy if exists "project images public read" on storage.objects;
create policy "project images public read"
  on storage.objects for select
  using (bucket_id = 'projects');

drop policy if exists "users upload own project images" on storage.objects;
create policy "users upload own project images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own project images" on storage.objects;
create policy "users update own project images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own project images" on storage.objects;
create policy "users delete own project images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- project_updates: the build log
-- ============================================================
create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  created_at timestamptz not null default now()
);

alter table public.project_updates enable row level security;

create index if not exists project_updates_project_idx
  on public.project_updates (project_id, created_at desc);

-- Read: anyone who can see the project (inherits neighborhood/reach scope).
drop policy if exists "updates readable with project" on public.project_updates;
create policy "updates readable with project"
  on public.project_updates for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

-- Post: the founder or an accepted teammate, always as themselves.
drop policy if exists "team posts updates" on public.project_updates;
create policy "team posts updates"
  on public.project_updates for insert to authenticated
  with check (
    auth.uid() = author_id
    and (
      exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.memberships m
        where m.project_id = project_updates.project_id
          and m.user_id = auth.uid()
          and m.status = 'accepted'
      )
    )
  );

-- Remove: your own update, or the founder tidying the project's log.
drop policy if exists "author or founder removes update" on public.project_updates;
create policy "author or founder removes update"
  on public.project_updates for delete to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Rate cap: 20 updates per user per day (ledger from migration 0017).
create or replace function public.cap_project_updates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'project_update', 20, interval '24 hours');
  end if;
  return new;
end;
$$;
drop trigger if exists project_updates_rate_cap on public.project_updates;
create trigger project_updates_rate_cap
  before insert on public.project_updates
  for each row execute function public.cap_project_updates();

-- Realtime so the project page and feed refresh when an update lands.
do $$
begin
  alter publication supabase_realtime add table public.project_updates;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
