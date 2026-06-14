-- Tracks each user's Stripe subscription so the app can gate features by plan tier.
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  tier                    text,
  status                  text not null default 'trialing',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_key on public.subscriptions (user_id);
create unique index if not exists subscriptions_stripe_subscription_id_key on public.subscriptions (stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
