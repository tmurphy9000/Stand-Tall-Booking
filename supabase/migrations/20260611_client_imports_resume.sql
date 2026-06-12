-- Track resumable progress for client import jobs so a long-running import
-- can be picked back up if the edge function is interrupted partway through.
alter table public.client_imports
  add column if not exists last_chunk integer not null default 0;

alter table public.client_imports
  add column if not exists total_chars integer;
