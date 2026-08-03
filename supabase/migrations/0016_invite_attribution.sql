-- Peoplearound — 0016 invite attribution
-- Personal invite links: /login?via=<user id> stamps a cookie, and when the
-- invited person signs up, profiles.invited_by records who brought them.
-- This powers "brought N neighbors here" — attribution as a fact on your
-- record, in the same deeds-not-points currency as everything else.
-- Founding-neighbor status needs no schema: it is derived from join order
-- (community_members.created_at rank ≤ 10). Idempotent.

alter table public.profiles
  add column if not exists invited_by uuid references public.profiles (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_no_self_invite'
  ) then
    alter table public.profiles
      add constraint profiles_no_self_invite check (invited_by is null or invited_by <> id);
  end if;
end
$$;

create index if not exists profiles_invited_by_idx on public.profiles (invited_by);
