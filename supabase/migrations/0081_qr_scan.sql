-- Peoplearound — 0081 a printed QR code can be its own destination
--
-- Migration 0073 made /qr/<code> a link we own: the row says where a scan
-- goes. Some codes now go nowhere else — the page is the destination, built
-- into the site (src/app/qr/_hosted). Elle's /qr/1 is the first: her own
-- page, with her Venmo code on it.
--
-- qr_target() counted a scan only when it had a URL to hand back, so a code
-- that shows its own page would never have been counted. qr_scan() replaces
-- it. It counts every resolution of a code that is switched on and returns
-- what the row knows — the destination, if one is set, and whether the code
-- is on — as one JSON object, or null for a code nobody made. The page
-- decides from that: a destination wins, the hosted page comes next, the
-- front door is the fallback.
--
-- p_count lets the deploy-time smoke test resolve a code without counting
-- itself as interest.
--
-- Same posture as before: SECURITY DEFINER, takes one code, reveals one row,
-- cannot list codes. The table stays unreadable to anon and authenticated.
--
-- Idempotent.

create or replace function public.qr_scan(p_slug text, p_count boolean default true)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_url text;
  v_enabled boolean;
begin
  if p_count then
    update public.qr_codes
       set scans = scans + 1,
           last_scan_at = now()
     where slug = p_slug
       and enabled;
  end if;

  select url, enabled
    into v_url, v_enabled
    from public.qr_codes
   where slug = p_slug;

  if not found then
    return null;
  end if;

  return jsonb_build_object('url', v_url, 'enabled', v_enabled);
end;
$$;

revoke all on function public.qr_scan(text, boolean) from public;
grant execute on function public.qr_scan(text, boolean) to anon, authenticated;

-- Superseded: the page calls qr_scan() now.
drop function if exists public.qr_target(text);
