-- Tracks questionnaire drop-offs so we can follow up on incomplete signups.
-- Rows are inserted anonymously on first step advance and updated per step.
-- No anon SELECT: the UUID acts as a write-only token.

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text,
  phone           text,
  name            text,
  shop_name       text,
  current_step    text,
  selected_tier   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  completed       boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  linked_shop_id  uuid
);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- Anon/authenticated can create a new attempt row.
CREATE POLICY "signup_attempts_insert"
  ON public.signup_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anon/authenticated can update any row by its id.
-- The UUID is not guessable and there is no anon SELECT, so this is safe.
CREATE POLICY "signup_attempts_update"
  ON public.signup_attempts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Only superadmin barbers may read.
CREATE POLICY "signup_attempts_select_superadmin"
  ON public.signup_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.barbers
      WHERE barbers.user_id = auth.uid()
        AND barbers.permission_level = 'superadmin'
    )
  );
