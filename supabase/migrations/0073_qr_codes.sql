-- Peoplearound — 0073 printed QR codes that can be pointed somewhere else
--
-- A QR code on paper cannot be edited. The link inside it can, if it points
-- at us first: peoplearound.com/qr/<code> looks the code up here and sends
-- the visitor wherever this table currently says. Change the row, and every
-- code already printed goes somewhere new on the next scan — no reprint, no
-- deploy.
--
-- The first one is /qr/1, printed for Elle. Until a destination is set, the
-- route sends people to the front door rather than nowhere.
--
-- The table is read-only to everyone: row-level security is on and there are
-- no policies, so neither anon nor a signed-in session can read or write it.
-- Two ways in, both narrow:
--   • qr_target() below — SECURITY DEFINER, takes a code, counts the scan and
--     returns one URL. It cannot list codes or reveal anything else.
--   • the admin console, through the service role, which already requires
--     profiles.is_admin (src/lib/admin.ts).
--
-- The destination is constrained to http(s) here as well as in the form, so
-- nothing can turn a printed code into a javascript: or data: payload.
--
-- Idempotent.

create table if not exists public.qr_codes (
  slug text primary key,
  -- Where it goes. Null until someone decides.
  url text,
  constraint qr_codes_url_is_web check (url is null or url ~* '^https?://'),
  -- What this code is, for whoever reads the admin list later.
  label text,
  enabled boolean not null default true,
  -- Scans include link previews (iMessage, WhatsApp and the like fetch URLs
  -- to build their cards), so read it as interest, not as people.
  scans integer not null default 0,
  last_scan_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.qr_codes enable row level security;

-- Resolve one code and count the scan. Returns null when the code is
-- unknown, switched off, or has no destination yet — the route then sends
-- the visitor to the front door.
create or replace function public.qr_target(p_slug text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  update public.qr_codes
     set scans = scans + 1,
         last_scan_at = now()
   where slug = p_slug
     and enabled
     and url is not null
  returning url into v_url;

  return v_url;
end;
$$;

revoke all on function public.qr_target(text) from public;
grant execute on function public.qr_target(text) to anon, authenticated;

-- The code already printed.
insert into public.qr_codes (slug, label)
values ('1', 'Elle')
on conflict (slug) do nothing;
