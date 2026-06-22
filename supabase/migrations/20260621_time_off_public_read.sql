-- Allow the anon role (public booking page) to read approved time-off records.
-- ClientBooking.jsx needs to know which barbers are on approved leave so it can
-- block those dates from online booking — the same guarantee the internal
-- calendar already provides. Only approved rows are exposed; this is equivalent
-- to "barber unavailable on these dates" which is public availability data.

CREATE POLICY "time_off_requests_select_public_approved"
  ON public.time_off_requests FOR SELECT
  TO anon
  USING (status = 'approved');
