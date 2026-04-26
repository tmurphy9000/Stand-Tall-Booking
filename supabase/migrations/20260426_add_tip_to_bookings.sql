-- Add tip column to bookings table so tips can be tracked per appointment
alter table public.bookings add column if not exists tip numeric(10,2) default 0;

-- Add product_revenue so product and service commissions can be calculated separately
alter table public.bookings add column if not exists product_revenue numeric(10,2) default 0;
