-- Peoplearound — 0079 the thing that happens every week
--
-- The most common neighborhood event is the recurring one: the Tuesday
-- poker game, the first-Saturday litter pick, the monthly repair café. Today
-- each one has to be typed in again, with the jobs listed again, which is
-- why the second week so often does not get planned at all.
--
-- This copies an event forward: same time, same place, same words, same jobs
-- (without the people who took them — next week is a new ask). Each copy is
-- an ordinary event from then on, so one can move or be called off without
-- touching the others. There is no series object, deliberately: a series is a
-- thing to maintain, and the honest shape of "we meet most Tuesdays" is a
-- handful of separate evenings.
--
-- Copies are never published. A share code belongs to the event it was
-- printed for, so each new evening starts unpublished and gets its own.
--
-- SECURITY INVOKER: the insert obeys the events policy exactly as a hand-made
-- event would, so only a steward can do this, and the database says so rather
-- than this function deciding.
--
-- Idempotent.

create or replace function public.repeat_event(
  p_event uuid,
  p_every text,
  p_times integer
)
returns integer
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_src public.events%rowtype;
  v_step interval;
  v_made integer := 0;
  v_new uuid;
  i integer;
  r record;
begin
  select * into v_src from public.events where id = p_event;
  if v_src.id is null then
    raise exception 'no such event';
  end if;

  v_step := case p_every
              when 'week' then interval '7 days'
              when 'fortnight' then interval '14 days'
              when 'month' then interval '1 month'
            end;
  if v_step is null then
    raise exception 'repeat every week, fortnight or month'
      using errcode = '22023';
  end if;
  if p_times is null or p_times < 1 or p_times > 12 then
    raise exception 'between 1 and 12 more times' using errcode = '22023';
  end if;

  for i in 1..p_times loop
    insert into public.events (
      project_id, title, starts_at, ends_at, place, description,
      photo_url, created_by
    )
    values (
      v_src.project_id,
      v_src.title,
      v_src.starts_at + (v_step * i),
      case when v_src.ends_at is null then null
           else v_src.ends_at + (v_step * i) end,
      v_src.place,
      v_src.description,
      v_src.photo_url,
      auth.uid()
    )
    returning id into v_new;

    -- The jobs come along; the people who took them do not.
    for r in
      select title, detail, needed, position
        from public.event_roles
       where event_id = p_event
       order by position, created_at
    loop
      insert into public.event_roles (event_id, title, detail, needed, position, created_by)
      values (v_new, r.title, r.detail, r.needed, r.position, auth.uid());
    end loop;

    v_made := v_made + 1;
  end loop;

  return v_made;
end;
$$;

revoke all on function public.repeat_event(uuid, text, integer) from public, anon;
grant execute on function public.repeat_event(uuid, text, integer) to authenticated;
