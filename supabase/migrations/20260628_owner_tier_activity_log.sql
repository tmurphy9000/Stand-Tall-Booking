-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure the barbers self-read policy exists (may already be applied manually)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'barbers'
      AND policyname = 'Users can read own barber row'
  ) THEN
    CREATE POLICY "Users can read own barber row"
      ON public.barbers FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Promote the platform owner account (tanner@standtallbarbering.com)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.barbers
SET permission_level = 'owner'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tanner@standtallbarbering.com');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Append-only admin activity log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid        NOT NULL,
  actor_name      text        NOT NULL,
  actor_email     text        NOT NULL,
  action_type     text        NOT NULL,
  target_type     text,
  target_id       text,
  target_label    text,
  old_value       jsonb,
  new_value       jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT: any barbers row with permission_level='owner' matching the caller.
-- No shop_id restriction — matches the isOwnerTier definition in usePermissions.jsx.
CREATE POLICY "owner_select_activity_log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE user_id = auth.uid()
        AND permission_level = 'owner'
    )
  );

-- No INSERT, UPDATE, or DELETE policies for client roles.
-- Inserts come only from SECURITY DEFINER triggers or the service-role edge function.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger: log every recurring block series deletion
--    Fires once per DELETE statement; the transition table gives all deleted rows.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_recurring_block_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id    uuid;
  v_actor_name  text;
  v_actor_email text;
BEGIN
  -- No JWT context (service-role calls, migrations) → skip
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT name, email
  INTO   v_actor_name, v_actor_email
  FROM   public.barbers
  WHERE  user_id = auth.uid()
  LIMIT  1;

  FOR v_group_id IN
    SELECT DISTINCT repeat_group_id
    FROM   deleted_rows
    WHERE  repeat_group_id IS NOT NULL
  LOOP
    INSERT INTO public.admin_activity_log
      (actor_user_id, actor_name, actor_email,
       action_type, target_type, target_id, target_label)
    VALUES
      (auth.uid(),
       COALESCE(v_actor_name,  'Unknown'),
       COALESCE(v_actor_email, 'unknown'),
       'recurring_block_series_deleted',
       'booking_block',
       v_group_id::text,
       'Recurring block series ' || v_group_id::text);
  END LOOP;

  RETURN NULL;
END;
$$;

-- Prevent direct client calls (trigger functions can't normally be called directly,
-- but revoke just in case)
REVOKE EXECUTE ON FUNCTION public.log_recurring_block_deletion() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_log_recurring_block_deletion ON public.bookings;
CREATE TRIGGER trg_log_recurring_block_deletion
  AFTER DELETE ON public.bookings
  REFERENCING OLD TABLE AS deleted_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.log_recurring_block_deletion();
