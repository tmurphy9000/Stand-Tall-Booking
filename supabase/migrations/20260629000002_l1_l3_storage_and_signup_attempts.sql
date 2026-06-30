-- ─────────────────────────────────────────────────────────────────────────────
-- L-1: Remove stale "Barber Photos" bucket and tighten storage RLS
-- ─────────────────────────────────────────────────────────────────────────────
-- Active bucket is "barber-photos" (lowercase-hyphen).
-- "Barber Photos" (capital B, space) was created 13 minutes earlier, has zero
-- objects, and is never referenced by any frontend code.

-- 1a. "Barber Photos" bucket deleted via Supabase Storage Management API
--     (direct SQL DELETE on storage.buckets is blocked by a trigger).
--     The bucket had zero objects, so deletion was safe.

-- 1b. Drop all policies scoped to the now-deleted stale bucket.
DROP POLICY IF EXISTS "Barber Photos aozngl_0" ON storage.objects;

-- 1c. Drop duplicate INSERT policies on the active bucket (keep one).
DROP POLICY IF EXISTS "Authenticated can upload barber photos" ON storage.objects;
-- "Authenticated upload barber photos" remains — any authenticated user can upload.

-- 1d. Drop duplicate SELECT policies on the active bucket (keep one).
DROP POLICY IF EXISTS "Public read barber photos" ON storage.objects;
-- "Public can view barber photos" remains — public SELECT on barber-photos is intentional
-- (photos are served publicly as barber profile images).

-- 1e. Tighten UPDATE: only the original uploader may overwrite their own file.
--     The frontend upload path is "${Date.now()}.ext" (always unique), so this
--     policy only fires on deliberate re-uploads of the exact same filename.
--     True shop-scope would require a "{shop_id}/" path prefix — noted as a
--     future improvement in BarberManager.jsx.
DROP POLICY IF EXISTS "Authenticated update barber photos" ON storage.objects;

CREATE POLICY "barber_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING  (bucket_id = 'barber-photos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'barber-photos');

-- 1f. Tighten DELETE: original uploader OR any shop admin may delete.
--     Admins (owner/manager/superadmin) need delete access to clean up orphaned
--     photos after a barber leaves. Without a shop_id path prefix this can't be
--     further scoped to "own shop's photos only" — see note above.
DROP POLICY IF EXISTS "Authenticated delete barber photos" ON storage.objects;

CREATE POLICY "barber_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'barber-photos'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.barbers
        WHERE user_id = auth.uid()
          AND permission_level = ANY(ARRAY['owner','manager','superadmin'])
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- L-3: Tighten signup_attempts UPDATE to protect finalized rows
-- ─────────────────────────────────────────────────────────────────────────────
-- Current policy: qual=true, with_check=true — any anon can update any row.
-- The signup flow always calls .eq("id", id) so the client-side scoping is
-- correct, but RLS doesn't enforce it.
--
-- True per-session scoping would require a session_token column — that is a
-- larger refactor. The fix here protects the most important invariant: once a
-- signup attempt is marked completed=true it cannot be modified by anyone
-- (prevents corruption of finalized sign-ups).
--
-- USING (completed = false): blocks updates to rows that are already finalized.
-- WITH CHECK (true): allows the completion step to set completed=true on an
-- in-progress row (USING is checked against the OLD row, so a row that is
-- currently false can be set to true).

DROP POLICY IF EXISTS "signup_attempts_update" ON public.signup_attempts;

CREATE POLICY "signup_attempts_update" ON public.signup_attempts
  FOR UPDATE TO anon, authenticated
  USING (completed = false)
  WITH CHECK (true);
