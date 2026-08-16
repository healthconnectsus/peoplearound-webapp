-- Peoplearound — 0035 stock photo cache + per-city recency
--
-- Two problems, one table.
--
-- 1. Every visit to "The basics" hit the Unsplash API for the same three
--    photos. Their free tier is 50 requests/hour — a handful of neighbors
--    opening the wizard at once would exhaust it, and the photos shown were
--    identical anyway. So results are cached by search query and reused.
--
-- 2. If two neighbors in the same city both pick the first "fitness" photo,
--    the feed shows the same picture twice and the place looks generated
--    rather than lived-in. A photo used in a city within the last 7 days is
--    withheld from that city's pickers — not deleted, just not offered
--    again for a week. The window is deliberately short: the pool is finite
--    (Unsplash returns ~10k results but we page through few), and a
--    permanent ban would eventually starve a busy city.
--
-- Both tables are operator/service data, not user content: no RLS policies
-- for writes, and reads happen server-side through the API route only.
-- Idempotent.

-- Cached search results. One row per (query, position) so a query's three
-- photos stay ordered and individually addressable.
create table if not exists public.stock_photos (
  id text primary key,                    -- Unsplash photo id
  query text not null,                    -- the search that surfaced it
  url text not null,                      -- urls.regular
  thumb text not null,                    -- urls.thumb
  alt text,
  download_location text not null,        -- for the required tracking ping
  photographer text not null,
  photographer_url text not null,
  fetched_at timestamptz not null default now()
);

create index if not exists stock_photos_query_idx
  on public.stock_photos (query, fetched_at desc);

-- Which photo was used where, and when. `city` is text rather than a
-- community FK on purpose: the rule is about a *place* looking repetitive,
-- and one city holds many communities.
create table if not exists public.stock_photo_uses (
  id uuid primary key default gen_random_uuid(),
  photo_id text not null references public.stock_photos(id) on delete cascade,
  city text not null,
  used_at timestamptz not null default now()
);

create index if not exists stock_photo_uses_city_idx
  on public.stock_photo_uses (city, used_at desc);

alter table public.stock_photos enable row level security;
alter table public.stock_photo_uses enable row level security;

-- Signed-in users may read the cache (the picker renders from it). Writes
-- go through the service role in the API route, which bypasses RLS.
drop policy if exists "stock photos readable" on public.stock_photos;
create policy "stock photos readable"
  on public.stock_photos for select
  to authenticated
  using (true);

drop policy if exists "stock photo uses readable" on public.stock_photo_uses;
create policy "stock photo uses readable"
  on public.stock_photo_uses for select
  to authenticated
  using (true);
