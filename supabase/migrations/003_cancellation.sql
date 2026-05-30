-- Cancellation metadata for bookings. The `no_overlapping_court_bookings`
-- gist constraint in 001 already skips rows where `status = 'cancelled'`, so
-- moving a booking to cancelled frees up the slot automatically.

alter table public.bookings
  add column if not exists cancelled_at timestamptz;

alter table public.bookings
  add column if not exists cancellation_reason text;

-- Helpful when listing a player's history sorted by recency.
create index if not exists bookings_status_start_idx
  on public.bookings (status, start_time);
