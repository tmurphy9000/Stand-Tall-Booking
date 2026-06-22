-- Marketing Phase 1: schema foundation
-- Adds birthdate + marketing_email_opt_out to clients,
-- and creates promo_codes, marketing_campaigns, campaign_sends tables.

-- ── Client additions ──────────────────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS marketing_email_opt_out boolean NOT NULL DEFAULT false;

-- ── Promo codes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid          NOT NULL DEFAULT public.current_shop_id() REFERENCES public.shops(id),
  code        text          NOT NULL,
  type        text          NOT NULL CHECK (type IN ('fixed', 'percent')),
  value       numeric(10,2) NOT NULL CHECK (value > 0),
  max_uses    integer,
  use_count   integer       NOT NULL DEFAULT 0,
  expires_at  timestamptz,
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);

-- ── Marketing campaigns ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid        NOT NULL DEFAULT public.current_shop_id() REFERENCES public.shops(id),
  name            text        NOT NULL,
  channel         text        NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'both')),
  type            text        NOT NULL DEFAULT 'one_time' CHECK (type IN ('one_time', 'automation', 'template')),
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'scheduled', 'sent', 'active', 'paused', 'template')),
  subject         text,
  body_html       text,
  body_text       text,
  segment_type    text        NOT NULL DEFAULT 'all'
                              CHECK (segment_type IN ('all', 'win_back', 'birthday', 'review_request', 'custom')),
  segment_params  jsonb       NOT NULL DEFAULT '{}',
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  recipient_count integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Campaign sends (per-recipient delivery log) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid        NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  client_id    uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel      text        NOT NULL DEFAULT 'email',
  status       text        NOT NULL DEFAULT 'sent'
                           CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  opened_at    timestamptz,
  clicked_at   timestamptz
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.promo_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sends       ENABLE ROW LEVEL SECURITY;

-- Staff (authenticated) get full access to all marketing tables
CREATE POLICY "promo_codes_authenticated_all"
  ON public.promo_codes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "marketing_campaigns_authenticated_all"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "campaign_sends_authenticated_all"
  ON public.campaign_sends FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Anon can read active promo codes so the public booking page can validate them
CREATE POLICY "promo_codes_anon_select_active"
  ON public.promo_codes FOR SELECT TO anon
  USING (active = true);
