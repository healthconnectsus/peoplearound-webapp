begin;
create or replace function public.admin_activity(p_user uuid default null,p_community uuid default null)
returns jsonb language sql stable security definer set search_path=public as $$
with activity as (
 select p.id,p.owner_id actor,p.neighborhood_id community,'project' kind,p.title,p.created_at,'/projects/'||p.id href from public.projects p
 union all
 select e.id,e.created_by,p.neighborhood_id,'event',e.title,e.created_at,'/projects/'||p.id from public.events e join public.projects p on p.id=e.project_id
 union all
 select o.id,o.user_id,o.neighborhood_id,case when o.kind::text='need' then 'small help' else 'offer' end,o.title,o.created_at,case when o.kind::text='need' then '/asks' else '/offers' end from public.offers o
 union all
 select u.id,u.author_id,p.neighborhood_id,'update',left(u.body,140),u.created_at,'/projects/'||p.id from public.project_updates u join public.projects p on p.id=u.project_id
 union all
 select c.id,c.contributor_id,p.neighborhood_id,'contribution',left(c.description,140),c.created_at,'/projects/'||p.id from public.contributions c join public.projects p on p.id=c.project_id
), selected as (
 select * from activity where (p_user is not null or p_community is not null)
 and (p_user is null or actor=p_user) and (p_community is null or community=p_community)
), totals as (select kind,count(*) n from selected group by kind), recent as (select * from selected order by created_at desc limit 100)
select jsonb_build_object('totals',coalesce((select jsonb_object_agg(kind,n) from totals),'{}'::jsonb),
'entries',coalesce((select jsonb_agg(to_jsonb(recent) order by created_at desc) from recent),'[]'::jsonb));
$$;
revoke all on function public.admin_activity(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_activity(uuid,uuid) to service_role;
create index if not exists events_creator_idx on public.events(created_by,created_at);
commit;
