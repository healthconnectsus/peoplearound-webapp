-- Peoplearound — 0005 contributions + attestations
-- The trust core. A teammate logs a contribution (always 'logged'), the
-- founder accepts it ('accepted'), and it becomes 'confirmed' only after a
-- co-attestation from another participant (teammate or stargazer). No
-- self-crediting: the contributor can never accept or attest their own work,
-- and the founder cannot log contributions (they have no membership row).
-- If the founder is unresponsive for 7 days, community attestation alone
-- confirms — credit routes around a flaky founder. Idempotent.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contribution_type') then
    create type public.contribution_type as enum
      ('knowledge', 'resource', 'skill', 'time', 'presence');
  end if;
  if not exists (select 1 from pg_type where typname = 'contribution_status') then
    -- No 'rejected' or 'failed' status by design.
    create type public.contribution_status as enum
      ('logged', 'accepted', 'confirmed');
  end if;
end
$$;

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contributor_id uuid not null references public.profiles (id) on delete cascade,
  type public.contribution_type not null,
  description text not null check (char_length(description) between 1 and 1000),
  status public.contribution_status not null default 'logged',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  confirmed_at timestamptz
);

create table if not exists public.attestations (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  attester_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contribution_id, attester_id) -- one attestation per witness
);

alter table public.contributions enable row level security;
alter table public.attestations enable row level security;

create index if not exists contributions_project_id_idx
  on public.contributions (project_id);
create index if not exists contributions_contributor_id_idx
  on public.contributions (contributor_id);
create index if not exists attestations_contribution_id_idx
  on public.attestations (contribution_id);

-- ------------------------------------------------------------------
-- contributions policies
-- ------------------------------------------------------------------

-- Read: any signed-in user can see a project's contribution record.
drop policy if exists "contributions readable by authenticated" on public.contributions;
create policy "contributions readable by authenticated"
  on public.contributions for select to authenticated using (true);

-- Log: only an accepted teammate may log, only as themselves, only as
-- 'logged'. The founder has no membership row, so they cannot self-credit.
drop policy if exists "teammates log contributions" on public.contributions;
create policy "teammates log contributions"
  on public.contributions for insert to authenticated
  with check (
    auth.uid() = contributor_id
    and status = 'logged'
    and exists (
      select 1 from public.memberships m
      where m.project_id = contributions.project_id
        and m.user_id = auth.uid()
        and m.status = 'accepted'
    )
  );

-- Accept: only the founder, never for their own work, and only the
-- logged → accepted step (USING sees the old row, WITH CHECK the new).
-- The confirmed step happens exclusively via reconcile_contributions below.
drop policy if exists "founder accepts contributions" on public.contributions;
create policy "founder accepts contributions"
  on public.contributions for update to authenticated
  using (
    status = 'logged'
    and contributor_id <> auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (status = 'accepted');

-- Withdraw / decline: the contributor or the founder may quietly remove a
-- contribution while it is still 'logged'. Accepted and confirmed history
-- is permanent.
drop policy if exists "withdraw or decline logged" on public.contributions;
create policy "withdraw or decline logged"
  on public.contributions for delete to authenticated
  using (
    status = 'logged'
    and (
      auth.uid() = contributor_id
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------------
-- attestations policies
-- ------------------------------------------------------------------

drop policy if exists "attestations readable by authenticated" on public.attestations;
create policy "attestations readable by authenticated"
  on public.attestations for select to authenticated using (true);

-- Attest: only as yourself; never your own contribution; never as the
-- founder (their acceptance is a separate signal — co-attestation must come
-- from a second person); only if you are an accepted teammate or a stargazer
-- of the project (someone plausibly in a position to have witnessed it).
drop policy if exists "witnesses attest" on public.attestations;
create policy "witnesses attest"
  on public.attestations for insert to authenticated
  with check (
    auth.uid() = attester_id
    and exists (
      select 1
      from public.contributions c
      join public.projects p on p.id = c.project_id
      where c.id = contribution_id
        and c.contributor_id <> auth.uid()
        and p.owner_id <> auth.uid()
        and (
          exists (
            select 1 from public.memberships m
            where m.project_id = c.project_id
              and m.user_id = auth.uid()
              and m.status = 'accepted'
          )
          or exists (
            select 1 from public.stars s
            where s.project_id = c.project_id and s.user_id = auth.uid()
          )
        )
    )
  );

-- No update/delete policies: an attestation, once given, stands.

-- ------------------------------------------------------------------
-- Server-side confirmation logic
-- ------------------------------------------------------------------

-- Stamp accepted_at when the founder accepts.
create or replace function public.stamp_contribution_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'accepted' and old.status = 'logged' then
    new.accepted_at := now();
  end if;
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    new.confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists contributions_stamp_status on public.contributions;
create trigger contributions_stamp_status
  before update on public.contributions
  for each row execute function public.stamp_contribution_status();

-- The only path to 'confirmed'. Security definer so it bypasses RLS (clients
-- cannot write 'confirmed' directly — the update policy above only allows
-- logged → accepted). Confirms every contribution in a project that is:
--   • accepted by the founder and has ≥ 1 attestation, or
--   • still 'logged' after 7 days but has ≥ 1 attestation
--     (community attestation routes around an unresponsive founder).
-- Idempotent; called after accept/attest actions and on project page load.
create or replace function public.reconcile_contributions(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contributions c
     set status = 'confirmed'
   where c.project_id = p_project_id
     and c.status <> 'confirmed'
     and exists (
       select 1 from public.attestations a where a.contribution_id = c.id
     )
     and (
       c.status = 'accepted'
       or c.created_at < now() - interval '7 days'
     );
end;
$$;

-- Supabase's default privileges grant execute to anon/authenticated directly,
-- so revoke from both public and anon explicitly.
revoke all on function public.reconcile_contributions(uuid) from public;
revoke all on function public.reconcile_contributions(uuid) from anon;
grant execute on function public.reconcile_contributions(uuid) to authenticated;
