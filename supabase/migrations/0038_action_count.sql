-- Peoplearound — 0038 tell people about the cap BEFORE they write the post
--
-- The abuse caps (0017) are enforced by triggers that raise on insert —
-- correct as the last line of defense, but as the ONLY line it meant
-- someone could fill in all five wizard steps and learn at "Share it 🎉"
-- that today's allowance was already spent, losing the draft to the error
-- redirect. The wall belongs at the door, not past the checkout.
--
-- user_action_log deliberately has no RLS policies (only assert_rate
-- touches it), so pages need a read-only, non-logging peek at the caller's
-- own count. That is all this function is: your own number in a window,
-- nobody else's, nothing written.
-- Idempotent.

create or replace function public.my_action_count(
  p_action text,
  p_window interval default interval '24 hours'
) returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
    from public.user_action_log l
   where l.user_id = auth.uid()
     and l.action = p_action
     and l.created_at > now() - p_window;
$$;

revoke all on function public.my_action_count(text, interval) from anon;
grant execute on function public.my_action_count(text, interval) to authenticated;
