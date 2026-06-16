-- Fix url_slug for shops whose slug was generated from an email address
-- instead of the shop's display name. Uses shop_settings.shop_name when
-- available, falling back to the username portion of the email.

update public.shops s
set url_slug = lower(
  regexp_replace(
    regexp_replace(
      coalesce(
        -- prefer the shop's display name set in Settings → Booking Page
        (select trim(ss.shop_name)
         from public.shop_settings ss
         where ss.shop_id = s.id
           and ss.shop_name is not null
           and trim(ss.shop_name) != ''
         limit 1),
        -- fall back to email username (part before @)
        split_part(s.name, '@', 1)
      ),
      '[^a-zA-Z0-9 ]', '', 'g'   -- remove special chars
    ),
    '\s+', '-', 'g'               -- spaces → hyphens
  )
) || '-' || left(s.id::text, 8)
where s.name like '%@%';           -- only shops whose name is an email
