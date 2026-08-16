-- Peoplearound — 0036 a photo can answer more than one search
--
-- 0035 put `query` on stock_photos as a plain column with `id` as the
-- primary key, which quietly made the relationship one-to-one: when
-- "outdoors neighborhood" and "community neighborhood" both returned the
-- same photo, whichever upsert ran last claimed it and the other query lost
-- it from its cache. Warming 13 queries × 30 photos stored 360 rows but left
-- outdoors with 16 and community with 25 — the overlap was silently eaten.
--
-- The relationship is many-to-many and always was, so model it that way.
-- Photo metadata stays in stock_photos (one row per photo, no duplication);
-- which searches surfaced it moves to a junction table.
-- Idempotent.

create table if not exists public.stock_photo_queries (
  photo_id text not null references public.stock_photos(id) on delete cascade,
  query text not null,
  fetched_at timestamptz not null default now(),
  primary key (photo_id, query)
);

create index if not exists stock_photo_queries_query_idx
  on public.stock_photo_queries (query, fetched_at desc);

-- Carry over what 0035 managed to keep.
insert into public.stock_photo_queries (photo_id, query, fetched_at)
  select id, query, fetched_at from public.stock_photos
  where query is not null
  on conflict (photo_id, query) do nothing;

-- `query` on stock_photos is now a lie — a photo has many. Drop it so no
-- future reader trusts it.
alter table public.stock_photos drop column if exists query;

alter table public.stock_photo_queries enable row level security;

drop policy if exists "stock photo queries readable" on public.stock_photo_queries;
create policy "stock photo queries readable"
  on public.stock_photo_queries for select
  to authenticated
  using (true);
