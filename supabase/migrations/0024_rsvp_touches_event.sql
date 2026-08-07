-- Peoplearound — 0024 RSVPs bump their parent event
-- LiveRefresh subscribes project pages to `events:project_id=eq.<id>` and no
-- longer to `rsvps` (which has no project_id, so keeping it meant every RSVP
-- system-wide was pushed to every viewer). But an RSVP only writes the
-- `rsvps` row, so other viewers' "🙋 N going" counts went stale until their
-- next navigation.
--
-- Fix at the data layer, not the action layer, so it holds for every write
-- path: `events.updated_at` plus a trigger that touches the parent event
-- whenever an RSVP appears or disappears. SECURITY DEFINER because the
-- person RSVPing is not the event's founder and cannot update it directly.
-- Idempotent.

alter table public.events
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_event_from_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
     set updated_at = now()
   where id = coalesce(new.event_id, old.event_id);
  return null; -- AFTER trigger
end;
$$;

drop trigger if exists rsvps_touch_event on public.rsvps;
create trigger rsvps_touch_event
  after insert or delete on public.rsvps
  for each row execute function public.touch_event_from_rsvp();
