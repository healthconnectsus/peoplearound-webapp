-- Peoplearound — 0051 a crashed worker backs off instead of looping
--
-- Both queues leased work but left the SCHEDULE alone:
--
--   claim_event_city   set lease_until = now() + 10 min, next_run_at untouched
--   claim_event_source set lease_until = now() + 10 min, next_crawl_at untouched
--
-- The schedule was only ever advanced by the *finish* write, at the end of
-- the run. That is fine when the run finishes. It is a trap when it does not.
--
-- If an invocation is killed — Vercel's maxDuration, an OOM, a deploy mid-run
-- — the finish write never happens. Ten minutes later the lease expires, the
-- row is due again (its next_run_at is still in the past), and the ten-minute
-- cron claims THE SAME row. Nothing breaks loudly; it just repeats. Forever.
--
-- The cost is not hypothetical. For the crawler that is roughly 144 crawls a
-- day aimed at one website — about 864 requests to a stranger's server that
-- we are supposed to be a polite guest of, and a good way to be blocked or
-- reported. For the importer it re-spends a SerpApi search every ten minutes,
-- so one bad city can eat a 250-search monthly budget in under two days.
--
-- The fix is to make the claim itself pessimistic: assume the run may die, and
-- write the retry time BEFORE doing the work. A successful run then pulls the
-- schedule back to its normal cadence, exactly as it already does. So the
-- happy path is unchanged and the crash path degrades to "try again later"
-- rather than "try again immediately, forever".
--
-- Idempotent: both functions are CREATE OR REPLACE.

-- ------------------------------------------------------------------
-- Cities. Claim moves next_run_at a day out; the finish write in
-- lib/city-events/importer.ts pulls it to +7 days on success (or +1 day on a
-- handled error, which is the same day this now sets).
--
-- The manual admin path is unaffected: passing p_city_id still bypasses the
-- next_run_at <= now() test, so "Populate now" works whenever the operator
-- asks, regardless of when the queue would next have run it.
-- ------------------------------------------------------------------
create or replace function public.claim_event_city(p_city_id uuid default null)
returns setof public.event_cities language sql security definer set search_path = public as $$
  update public.event_cities c set lease_token = gen_random_uuid(),
    lease_until = now() + interval '10 minutes', last_attempt_at = now(), last_status = 'running',
    next_run_at = now() + interval '1 day'
  where c.id = (
    select q.id from public.event_cities q
    where q.enabled and (q.lease_until is null or q.lease_until < now())
      and exists (select 1 from public.neighborhoods n where public.event_city_key(n.city) = q.city_key)
      and ((p_city_id is null and q.next_run_at <= now()) or q.id = p_city_id)
    order by q.next_run_at, q.id for update skip locked limit 1
  ) returning c.*;
$$;

revoke all on function public.claim_event_city(uuid) from public, anon, authenticated;
grant execute on function public.claim_event_city(uuid) to service_role;

-- ------------------------------------------------------------------
-- Calendar sources. Claim moves next_crawl_at on by the source's own
-- interval, which is the same value the finish write uses — so a crashed
-- crawl simply waits its normal turn instead of hammering the site.
-- ------------------------------------------------------------------
create or replace function public.claim_event_source()
returns setof public.city_event_sources language sql security definer set search_path=public as $$
update public.city_event_sources s set lease_token=gen_random_uuid(),
  lease_until=now()+interval '10 minutes',
  next_crawl_at=now()+make_interval(hours => s.interval_hours)
where s.id=(select q.id from public.city_event_sources q join public.event_cities c on c.id=q.city_id
where q.enabled and c.enabled and q.next_crawl_at<=now() and (q.lease_until is null or q.lease_until<now())
order by q.next_crawl_at for update of q skip locked limit 1) returning s.*;
$$;

revoke all on function public.claim_event_source() from public, anon, authenticated;
grant execute on function public.claim_event_source() to service_role;
