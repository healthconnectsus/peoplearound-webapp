-- Peoplearound — 0028 co-organizers
-- Progression that unlocks RESPONSIBILITY, not vanity (PRD §3.10): a founder
-- can promote an accepted teammate to co-organizer. Co-organizers can accept
-- join requests, create/remove events, and accept contributions — everything
-- except deleting the project or promoting others.
--
-- This also de-risks the flaky-founder problem from a second direction: the
-- 7-day community-attestation bypass rescues *credit*; a co-organizer keeps
-- the *project* moving.
-- Idempotent.

alter table public.memberships
  add column if not exists role text not null default 'member';

alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships add constraint memberships_role_check
  check (role in ('member', 'co_organizer'));

-- Helper: may this user steward this project? (founder or co-organizer)
create or replace function public.can_steward(p_project_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = p_user
  ) or exists (
    select 1 from public.memberships m
    where m.project_id = p_project_id
      and m.user_id = p_user
      and m.status = 'accepted'
      and m.role = 'co_organizer'
  );
$$;

revoke all on function public.can_steward(uuid, uuid) from public;
grant execute on function public.can_steward(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------
-- Widen the founder-only policies to stewards.
-- Promotion itself stays founder-only (see WITH CHECK below).
-- ------------------------------------------------------------------
drop policy if exists "owner manages memberships" on public.memberships;
create policy "owner manages memberships"
  on public.memberships for update to authenticated
  using (public.can_steward(project_id, auth.uid()))
  with check (
    -- A co-organizer may accept/decline members, but only the founder may
    -- hand out the co-organizer role.
    role = 'member'
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "leave or owner removes" on public.memberships;
create policy "leave or owner removes"
  on public.memberships for delete to authenticated
  using (auth.uid() = user_id or public.can_steward(project_id, auth.uid()));

-- Events: stewards may run them.
drop policy if exists "founder creates events" on public.events;
create policy "founder creates events"
  on public.events for insert to authenticated
  with check (public.can_steward(project_id, auth.uid()));

drop policy if exists "founder updates events" on public.events;
create policy "founder updates events"
  on public.events for update to authenticated
  using (public.can_steward(project_id, auth.uid()))
  with check (public.can_steward(project_id, auth.uid()));

drop policy if exists "founder deletes events" on public.events;
create policy "founder deletes events"
  on public.events for delete to authenticated
  using (public.can_steward(project_id, auth.uid()));

-- Contributions: a co-organizer may accept others' work — still never
-- their own (no self-crediting, ever).
drop policy if exists "founder accepts contributions" on public.contributions;
create policy "founder accepts contributions"
  on public.contributions for update to authenticated
  using (
    status = 'logged'
    and contributor_id <> auth.uid()
    and public.can_steward(project_id, auth.uid())
  )
  with check (status = 'accepted');

drop policy if exists "withdraw or decline logged" on public.contributions;
create policy "withdraw or decline logged"
  on public.contributions for delete to authenticated
  using (
    status = 'logged'
    and (auth.uid() = contributor_id or public.can_steward(project_id, auth.uid()))
  );

-- Tell someone they've been trusted with the keys.
create or replace function public.notif_promoted()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if new.role = 'co_organizer' and old.role <> 'co_organizer' then
    select p.title into v_title from public.projects p where p.id = new.project_id;
    perform public.notify(new.user_id, 'joined',
      '🛠️ You''re now a co-organizer of “' || v_title || '”',
      '/projects/' || new.project_id);
  end if;
  return null;
end;
$$;
drop trigger if exists memberships_notify_promoted on public.memberships;
create trigger memberships_notify_promoted
  after update on public.memberships
  for each row execute function public.notif_promoted();
