-- Peoplearound — 0019 project flags (community moderation)
-- Any signed-in neighbor can flag a project once. When a project reaches the
-- review threshold (3 distinct flaggers), the web layer emails ops so a
-- human community admin can look at it. Nothing is auto-hidden: removal is
-- always a human decision, in keeping with "failure is invisible, dignity
-- first" — a flagged project keeps working until someone reviews it.
-- Idempotent.

create table if not exists public.project_flags (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','unsafe','not_local','other')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id) -- one flag per neighbor per project
);

alter table public.project_flags enable row level security;

create index if not exists project_flags_project_idx
  on public.project_flags (project_id);

-- Read: you can see your own flag (so the UI can say "you flagged this").
-- Nobody can enumerate others' flags from the client — counts and review
-- happen server-side (service role).
drop policy if exists "see own flags" on public.project_flags;
create policy "see own flags"
  on public.project_flags for select to authenticated
  using (user_id = auth.uid());

-- Flag: only as yourself, only on a project you can see, never your own.
drop policy if exists "flag as self" on public.project_flags;
create policy "flag as self"
  on public.project_flags for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id <> auth.uid()
    )
  );

-- Withdraw your own flag.
drop policy if exists "unflag own" on public.project_flags;
create policy "unflag own"
  on public.project_flags for delete to authenticated
  using (user_id = auth.uid());

-- Rate cap: 10 flags per user per day (migration 0017's ledger), so flagging
-- can't be weaponized at scale.
create or replace function public.cap_flagging()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'flag', 10, interval '24 hours');
  end if;
  return new;
end;
$$;
drop trigger if exists project_flags_rate_cap on public.project_flags;
create trigger project_flags_rate_cap
  before insert on public.project_flags
  for each row execute function public.cap_flagging();

-- Review queue: projects at or past the threshold, with context for the
-- ops email. Service-role only (no grant to anon/authenticated).
create or replace function public.flag_review(p_project_id uuid, p_threshold int default 3)
returns table (
  flag_count int,
  project_title text,
  owner_name text,
  community_name text,
  reasons text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.project_flags f where f.project_id = p.id),
    p.title,
    coalesce(pr.display_name, 'Someone'),
    coalesce(n.name, 'Unknown'),
    (select string_agg(distinct f.reason, ', ') from public.project_flags f
      where f.project_id = p.id)
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  left join public.neighborhoods n on n.id = p.neighborhood_id
  where p.id = p_project_id
    and (select count(*) from public.project_flags f where f.project_id = p.id) >= p_threshold;
$$;

revoke all on function public.flag_review(uuid, int) from public;
revoke all on function public.flag_review(uuid, int) from anon;
revoke all on function public.flag_review(uuid, int) from authenticated;
grant execute on function public.flag_review(uuid, int) to service_role;
