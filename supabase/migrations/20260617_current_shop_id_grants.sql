-- public.current_shop_id() is security definer and was created with the
-- default PUBLIC execute grant, which lets anon call it directly via
-- /rest/v1/rpc/current_shop_id (flagged by Supabase advisors). It's only
-- needed for RLS policies and column defaults evaluated as `authenticated`
-- (anon policies/inserts never reference it), so restrict execution to
-- authenticated.
revoke execute on function public.current_shop_id() from public;
grant execute on function public.current_shop_id() to authenticated;
