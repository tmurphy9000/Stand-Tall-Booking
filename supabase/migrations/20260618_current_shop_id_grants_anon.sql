-- Supabase grants EXECUTE on new public-schema functions directly to anon,
-- authenticated, and service_role via default privileges, independent of
-- the PUBLIC grant revoked in 20260617. Revoke it from anon explicitly so
-- public.current_shop_id() can't be called via /rest/v1/rpc as anon.
revoke execute on function public.current_shop_id() from anon;
