-- Peoplearound — 0025 notifications inbox + admin/digest flags
-- 1) A persistent notifications table, fanned out by DATABASE TRIGGERS so
--    every write path (actions, seeds, future API) produces the same
--    notifications. The TopBar bell reads this instead of recomputing.
-- 2) profiles.is_admin — gates the /admin console.
-- 3) profiles.digest_opt_out — respected by the weekly email digest.
-- Idempotent.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;
alter table public.profiles
  add column if not exists digest_opt_out boolean not null default false;

-- The operator's account is the first admin.
update public.profiles set is_admin = true
where id in (select id from auth.users where email = 'healthconnectsus@gmail.com');

-- ============================================================
-- notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in
    ('join_request','joined','star','contribution','confirmed','event')),
  body text not null check (char_length(body) <= 300),
  href text not null check (char_length(href) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- Read/update (mark read) your own; no client inserts or deletes —
-- notifications are made by triggers only.
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Helper: create a notification unless the target is the actor themself.
create or replace function public.notify(
  p_user uuid, p_kind text, p_body text, p_href text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, kind, body, href)
  values (p_user, p_kind, left(p_body, 300), left(p_href, 300));
end;
$$;

revoke all on function public.notify(uuid, text, text, text) from public;
revoke all on function public.notify(uuid, text, text, text) from anon;
revoke all on function public.notify(uuid, text, text, text) from authenticated;

-- ============================================================
-- Fan-out triggers
-- ============================================================

-- Someone asks to join → the founder hears about it.
create or replace function public.notif_join_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_name text;
begin
  select p.owner_id, p.title into v_owner, v_title
    from public.projects p where p.id = new.project_id;
  select coalesce(display_name, 'A neighbor') into v_name
    from public.profiles where id = new.user_id;
  if new.status = 'pending' then
    perform public.notify(v_owner, 'join_request',
      v_name || ' asked to join “' || v_title || '”',
      '/projects/' || new.project_id);
  end if;
  return null;
end;
$$;
drop trigger if exists notif_join_request on public.memberships;
create trigger notif_join_request
  after insert on public.memberships
  for each row execute function public.notif_join_request();

-- The founder accepts → the joiner gets the little celebration.
create or replace function public.notif_joined()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    select p.title into v_title from public.projects p where p.id = new.project_id;
    perform public.notify(new.user_id, 'joined',
      '🎉 You''re on the team for “' || v_title || '”',
      '/projects/' || new.project_id);
  end if;
  return null;
end;
$$;
drop trigger if exists notif_joined on public.memberships;
create trigger notif_joined
  after update on public.memberships
  for each row execute function public.notif_joined();

-- A star lands → the founder feels seen.
create or replace function public.notif_star()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_name text;
begin
  select p.owner_id, p.title into v_owner, v_title
    from public.projects p where p.id = new.project_id;
  select coalesce(display_name, 'A neighbor') into v_name
    from public.profiles where id = new.user_id;
  perform public.notify(v_owner, 'star',
    '⭐ ' || v_name || ' starred “' || v_title || '”',
    '/projects/' || new.project_id);
  return null;
end;
$$;
drop trigger if exists notif_star on public.stars;
create trigger notif_star
  after insert on public.stars
  for each row execute function public.notif_star();

-- A contribution is logged → the founder should accept or decline it.
create or replace function public.notif_contribution()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_name text;
begin
  select p.owner_id, p.title into v_owner, v_title
    from public.projects p where p.id = new.project_id;
  select coalesce(display_name, 'A neighbor') into v_name
    from public.profiles where id = new.contributor_id;
  perform public.notify(v_owner, 'contribution',
    v_name || ' logged a contribution on “' || v_title || '”',
    '/projects/' || new.project_id);
  return null;
end;
$$;
drop trigger if exists notif_contribution on public.contributions;
create trigger notif_contribution
  after insert on public.contributions
  for each row execute function public.notif_contribution();

-- Confirmation — the emotional peak — must never go unnoticed.
create or replace function public.notif_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    select p.title into v_title from public.projects p where p.id = new.project_id;
    perform public.notify(new.contributor_id, 'confirmed',
      '🙌 Your help on “' || v_title || '” was confirmed',
      '/projects/' || new.project_id);
  end if;
  return null;
end;
$$;
drop trigger if exists notif_confirmed on public.contributions;
create trigger notif_confirmed
  after update on public.contributions
  for each row execute function public.notif_confirmed();

-- A new event → every accepted teammate hears about it.
create or replace function public.notif_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select p.title into v_title from public.projects p where p.id = new.project_id;
  insert into public.notifications (user_id, kind, body, href)
  select m.user_id, 'event',
         '📅 New event “' || new.title || '” on “' || v_title || '”',
         '/projects/' || new.project_id
    from public.memberships m
   where m.project_id = new.project_id
     and m.status = 'accepted'
     and m.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  return null;
end;
$$;
drop trigger if exists notif_event on public.events;
create trigger notif_event
  after insert on public.events
  for each row execute function public.notif_event();
