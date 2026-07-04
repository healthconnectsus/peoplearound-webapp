-- Peoplearound — 0004 memberships
-- Joining a project is a request the owner approves. A membership row is
-- created 'pending' by the requester; the owner flips it to 'accepted' or
-- deletes it (decline). Leaving a project deletes the requester's own row.
-- The project owner is the implicit founder and never has a membership row.
-- Idempotent so it is safe to re-run.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('pending', 'accepted');
  end if;
end
$$;

create table if not exists public.memberships (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.membership_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id) -- one membership per neighbor per project
);

alter table public.memberships enable row level security;

create index if not exists memberships_project_id_idx on public.memberships (project_id);
create index if not exists memberships_user_id_idx on public.memberships (user_id);

-- Read: any signed-in user can see who has joined / requested to join.
drop policy if exists "memberships readable by authenticated" on public.memberships;
create policy "memberships readable by authenticated"
  on public.memberships for select to authenticated using (true);

-- Request to join: a user may only create their own row, and only as pending.
drop policy if exists "users request to join" on public.memberships;
create policy "users request to join"
  on public.memberships for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Approve: only the project's owner may update a membership (pending → accepted).
drop policy if exists "owner manages memberships" on public.memberships;
create policy "owner manages memberships"
  on public.memberships for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Delete: a member may leave (own row), or the owner may decline/remove.
drop policy if exists "leave or owner removes" on public.memberships;
create policy "leave or owner removes"
  on public.memberships for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );
