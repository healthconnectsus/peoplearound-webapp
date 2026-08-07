-- Peoplearound — 0027 offers (give / lend / offer)
-- The non-monetary replacement for a marketplace (PRD §3.8): neighbors post
-- things to give, lend, or skills to offer. NO prices, NO checkout, no money
-- anywhere — an offer is claimed by a person, not bought.
--
-- Scoping mirrors projects: an offer belongs to the poster's neighborhood
-- and is visible to that community (plus the poster). An offer may point at
-- a project, which is how it feeds the contribution loop.
-- Idempotent.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'offer_kind') then
    create type public.offer_kind as enum ('give', 'lend', 'offer');
  end if;
end
$$;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  kind public.offer_kind not null default 'give',
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  project_id uuid references public.projects (id) on delete set null,
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;

create index if not exists offers_neighborhood_idx on public.offers (neighborhood_id, created_at desc);
create index if not exists offers_user_idx on public.offers (user_id);

-- Stamp the poster's neighborhood server-side (same pattern as projects).
create or replace function public.set_offer_neighborhood()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select neighborhood_id into new.neighborhood_id
  from public.profiles where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists offers_set_neighborhood on public.offers;
create trigger offers_set_neighborhood
  before insert on public.offers
  for each row execute function public.set_offer_neighborhood();

-- Rate cap (ledger from migration 0017): 10 offers per user per day.
create or replace function public.cap_offers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'offer', 10, interval '24 hours');
  end if;
  return new;
end;
$$;
drop trigger if exists offers_rate_cap on public.offers;
create trigger offers_rate_cap
  before insert on public.offers
  for each row execute function public.cap_offers();

-- Read: your own, or anything in a community you belong to.
drop policy if exists "offers readable in your communities" on public.offers;
create policy "offers readable in your communities"
  on public.offers for select to authenticated
  using (
    user_id = auth.uid()
    or neighborhood_id = (
      select neighborhood_id from public.profiles where id = auth.uid()
    )
    or exists (
      select 1 from public.community_members m
      where m.user_id = auth.uid() and m.community_id = offers.neighborhood_id
    )
  );

-- Post: only as yourself.
drop policy if exists "post own offers" on public.offers;
create policy "post own offers"
  on public.offers for insert to authenticated
  with check (auth.uid() = user_id);

-- Update: the poster edits their own; anyone who can see an unclaimed offer
-- may claim it (WITH CHECK keeps a claimer from rewriting the content).
drop policy if exists "poster edits offer" on public.offers;
create policy "poster edits offer"
  on public.offers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "neighbor claims offer" on public.offers;
create policy "neighbor claims offer"
  on public.offers for update to authenticated
  using (
    claimed_by is null
    and user_id <> auth.uid()
    and (
      neighborhood_id = (select neighborhood_id from public.profiles where id = auth.uid())
      or exists (
        select 1 from public.community_members m
        where m.user_id = auth.uid() and m.community_id = offers.neighborhood_id
      )
    )
  )
  with check (claimed_by = auth.uid());

drop policy if exists "poster deletes offer" on public.offers;
create policy "poster deletes offer"
  on public.offers for delete to authenticated
  using (user_id = auth.uid());

-- Notify the poster when someone claims their offer.
create or replace function public.notif_offer_claim()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.claimed_by is not null and old.claimed_by is null then
    select coalesce(display_name, 'A neighbor') into v_name
      from public.profiles where id = new.claimed_by;
    perform public.notify(new.user_id, 'contribution',
      v_name || ' claimed your offer “' || new.title || '”', '/offers');
  end if;
  return null;
end;
$$;
drop trigger if exists offers_notify_claim on public.offers;
create trigger offers_notify_claim
  after update on public.offers
  for each row execute function public.notif_offer_claim();
