-- Remove the 4 marketing_campaigns template rows that were inserted into the
-- demo shop without explicit approval on 2026-09-08.
-- Scoped to the demo shop; no other data touched.

DELETE FROM public.marketing_campaigns
WHERE id IN (
  '413242a7-5d9b-4baf-9c1a-eab560671f66',  -- We Miss You
  '476ecae0-b7aa-4290-b288-7d3e29c747cf',  -- Leave Us a Review
  'c2ca3d8d-5656-4a30-9d1f-f3aef8e1e69a',  -- Win-Back 10% Off
  'ccdf2d85-9c33-4d0c-b5b1-79b769b9a9e3'   -- Happy Birthday
)
AND shop_id = '4bb6cc13-e208-42b8-8ef2-6d5ecbb87d59'  -- demo shop only
AND status = 'template';
