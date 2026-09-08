-- Demo shop: seed 2 sent campaigns + campaign_sends so the History tab
-- shows realistic open/click rates for help-doc screenshots.
-- All data is fake. Demo shop = 4bb6cc13-e208-42b8-8ef2-6d5ecbb87d59.

DO $$
DECLARE
  v_shop_id   uuid := '4bb6cc13-e208-42b8-8ef2-6d5ecbb87d59';
  v_camp1_id  uuid := 'aaaaaaaa-0001-4000-8000-000000000001';
  v_camp2_id  uuid := 'aaaaaaaa-0002-4000-8000-000000000002';
  -- Clients with emails
  v_james     uuid := 'eac0efd8-45f4-4fa4-92c0-3c3759c932c3'; -- James Anderson
  v_michael   uuid := 'ca46171b-e3d8-45c2-ab8a-903091ddb646'; -- Michael Thompson
  v_david     uuid := '7edd61f1-b94d-418e-8687-fb3cd0850612'; -- David Rodriguez
  v_robert    uuid := '3600b60c-f39c-4293-b32d-24d02d655b34'; -- Robert Kim
  v_chris     uuid := '38a6fd17-a482-4299-8fd2-08f0dd2f6867'; -- Christopher Davis
BEGIN

-- Campaign 1: "We Miss You" — win-back, sent ~45 days ago
INSERT INTO public.marketing_campaigns
  (id, shop_id, name, channel, type, status,
   subject, body_html, segment_type, segment_params,
   recipient_count, sent_at)
SELECT
  v_camp1_id, v_shop_id,
  'We Miss You', 'email', 'one_time', 'sent',
  'We miss you — come back and see us!',
  '<p>Hey {{client_name}}, it has been a while. We would love to have you back in the chair.</p>',
  'win_back', '{"days": 60}',
  5, (now() - interval '45 days')
WHERE NOT EXISTS (
  SELECT 1 FROM public.marketing_campaigns WHERE id = v_camp1_id
);

-- Campaign 2: "Leave Us a Review" — all clients, sent ~20 days ago
INSERT INTO public.marketing_campaigns
  (id, shop_id, name, channel, type, status,
   subject, body_html, segment_type, segment_params,
   recipient_count, sent_at)
SELECT
  v_camp2_id, v_shop_id,
  'Leave Us a Review', 'email', 'one_time', 'sent',
  'Enjoying your cut? We would love a review!',
  '<p>Hey {{client_name}}, thank you for visiting! Leaving us a review means the world.</p>',
  'all', '{}',
  5, (now() - interval '20 days')
WHERE NOT EXISTS (
  SELECT 1 FROM public.marketing_campaigns WHERE id = v_camp2_id
);

-- campaign_sends for Campaign 1 (5 sent, 3 opened, 2 clicked)
INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp1_id, v_james,   'sent', now()-'45 days'::interval, now()-'44 days'::interval, now()-'44 days'::interval
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp1_id AND client_id = v_james);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp1_id, v_michael, 'sent', now()-'45 days'::interval, now()-'43 days'::interval, now()-'43 days'::interval
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp1_id AND client_id = v_michael);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp1_id, v_david,   'sent', now()-'45 days'::interval, now()-'42 days'::interval, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp1_id AND client_id = v_david);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp1_id, v_robert,  'sent', now()-'45 days'::interval, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp1_id AND client_id = v_robert);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp1_id, v_chris,   'sent', now()-'45 days'::interval, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp1_id AND client_id = v_chris);

-- campaign_sends for Campaign 2 (5 sent, 2 opened, 1 clicked)
INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp2_id, v_james,   'sent', now()-'20 days'::interval, now()-'19 days'::interval, now()-'19 days'::interval
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp2_id AND client_id = v_james);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp2_id, v_michael, 'sent', now()-'20 days'::interval, now()-'19 days'::interval, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp2_id AND client_id = v_michael);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp2_id, v_david,   'sent', now()-'20 days'::interval, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp2_id AND client_id = v_david);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp2_id, v_robert,  'sent', now()-'20 days'::interval, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp2_id AND client_id = v_robert);

INSERT INTO public.campaign_sends (campaign_id, client_id, status, sent_at, opened_at, clicked_at)
SELECT v_camp2_id, v_chris,   'sent', now()-'20 days'::interval, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.campaign_sends WHERE campaign_id = v_camp2_id AND client_id = v_chris);

END $$;
