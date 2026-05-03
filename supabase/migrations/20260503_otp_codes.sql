create table if not exists public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists otp_codes_phone_idx on public.otp_codes (phone);

-- Anyone can call the edge functions (service role handles writes); no direct client access needed.
alter table public.otp_codes enable row level security;
