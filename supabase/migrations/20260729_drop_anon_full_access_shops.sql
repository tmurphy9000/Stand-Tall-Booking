-- Drop the "Anon full access shops" FOR ALL policy created in 20260611_client_imports.sql.
--
-- That migration enabled RLS on shops and immediately created a permissive FOR ALL
-- policy for both anon and authenticated (using: true, with check: true), which
-- allows unauthenticated callers to UPDATE or DELETE any shop row.
--
-- No later migration dropped it.  20260624_shops_anon_read_policy.sql only touched
-- the "Anon read shops" SELECT policy.  20260728_high_severity_rls_fixes.sql only
-- replaced the scoped "Owner can update their shop" UPDATE policy, leaving the root
-- cause ALL policy in place.
--
-- After this drop the effective policy set on shops is:
--   SELECT  — anon+authenticated via "Public can read shop info" / "Anon read shops"
--   UPDATE  — authenticated only, scoped to current shop via "shops_owner_update"
--   INSERT  — blocked (no policy)
--   DELETE  — blocked (no policy)

DROP POLICY IF EXISTS "Anon full access shops" ON public.shops;
