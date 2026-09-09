begin;
create or replace function public.welcome_context(p_user uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('email',u.email,'verified',u.email_confirmed_at is not null,
'name',p.display_name,'opt_out',p.digest_opt_out,'neighborhood',n.name,
'neighbors',(select count(*) from public.profiles pr join auth.users a on a.id=pr.id where pr.neighborhood_id=p.neighborhood_id and pr.id<>p.id and a.email_confirmed_at is not null and a.email !~* '@(example\.com|example\.invalid)$'),
'events',coalesce((select jsonb_agg(x) from (
  select e.title,e.source_url href,e.date_label from public.city_events e join public.event_cities ec on ec.id=e.city_id
  where ec.city_key=public.event_city_key(n.city) and ec.enabled and e.event_date>=current_date
  and e.expires_at>now() and e.status<>'cancelled' order by e.event_date limit 5
) x),'[]'::jsonb))
from public.profiles p join auth.users u on u.id=p.id join public.neighborhoods n on n.id=p.neighborhood_id where p.id=p_user;
$$;
revoke all on function public.welcome_context(uuid) from public,anon,authenticated;
grant execute on function public.welcome_context(uuid) to service_role;
commit;
