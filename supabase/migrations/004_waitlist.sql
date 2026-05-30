-- Waitlist: when a player taps "Notify me" on a booked slot, drop a row here.
-- When the matching booking later gets cancelled, the cancel route walks the
-- FIFO queue and emails the oldest unnotified entry.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  court_id int not null references public.courts(id) on delete cascade,
  slot_date date not null,
  slot_time time not null,
  player_email text not null,
  player_name text,
  notified boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_lookup_idx
  on public.waitlist (court_id, slot_date, slot_time, created_at);

create index if not exists waitlist_unnotified_idx
  on public.waitlist (court_id, slot_date, slot_time, created_at)
  where notified = false;

-- Public can insert their own waitlist entry; only service role reads it.
alter table public.waitlist enable row level security;
create policy "anyone can join the waitlist" on public.waitlist
  for insert with check (true);
