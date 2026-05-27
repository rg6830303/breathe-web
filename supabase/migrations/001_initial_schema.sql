create extension if not exists btree_gist;
create extension if not exists pg_net;

do $$ begin
  create type public.user_role as enum ('player', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notice_type as enum ('daily', 'weekly', 'monthly');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'player',
  current_streak int not null default 0 check (current_streak >= 0),
  current_xp int not null default 0 check (current_xp >= 0)
);

create table if not exists public.courts (
  id serial primary key,
  name text not null,
  type text not null
);

create table if not exists public.bookings (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  court_id int not null references public.courts(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  constraint no_overlapping_court_bookings exclude using gist (
    court_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled')
);

create table if not exists public.notice_board (
  id serial primary key,
  title text not null,
  content text not null,
  type public.notice_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.courts (id, name, type)
values (1, 'Court 1', 'Indoor Premium'), (2, 'Court 2', 'Indoor Standard')
on conflict (id) do update set name = excluded.name, type = excluded.type;

create or replace function public.touch_notice_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notice_board_touch_updated_at on public.notice_board;
create trigger notice_board_touch_updated_at
before update on public.notice_board
for each row execute function public.touch_notice_updated_at();

create or replace function public.slot_price(p_start_time timestamptz)
returns numeric language sql immutable as $$
  select case
    when extract(hour from p_start_time at time zone 'Asia/Kolkata') between 18 and 20 then 900
    when extract(hour from p_start_time at time zone 'Asia/Kolkata') between 6 and 15 then 600
    else 750
  end;
$$;

create or replace function public.create_verified_booking(
  p_user_id uuid,
  p_court_id int,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_equipment_total numeric default 0
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.bookings;
  base_amount numeric;
  final_amount numeric;
begin
  if p_end_time <= p_start_time then
    raise exception 'Invalid booking window';
  end if;

  perform 1
  from public.bookings
  where court_id = p_court_id
    and status <> 'cancelled'
    and tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time)
  for update;

  if found then
    raise exception 'Court slot is no longer available';
  end if;

  base_amount := public.slot_price(p_start_time);
  final_amount := round((base_amount + coalesce(p_equipment_total, 0)) * 1.18, 2);

  insert into public.bookings (user_id, court_id, start_time, end_time, total_amount, status)
  values (p_user_id, p_court_id, p_start_time, p_end_time, final_amount, 'confirmed')
  returning * into created;

  update public.profiles
  set current_xp = current_xp + 100,
      current_streak = greatest(current_streak, 1)
  where id = p_user_id;

  return created;
end;
$$;

create or replace function public.forward_booking_change_to_sheets()
returns trigger
language plpgsql
security definer
as $$
declare
  webhook_url text := current_setting('app.google_apps_script_webapp_url', true);
  payload jsonb;
begin
  if webhook_url is null or webhook_url = '' then
    return coalesce(new, old);
  end if;

  payload := jsonb_build_object(
    'event', tg_op,
    'table', tg_table_name,
    'record', case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists bookings_sheets_outbound on public.bookings;
create trigger bookings_sheets_outbound
after insert or delete on public.bookings
for each row execute function public.forward_booking_change_to_sheets();

alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.bookings enable row level security;
alter table public.notice_board enable row level security;

create policy "courts are public" on public.courts for select using (true);
create policy "notices are public" on public.notice_board for select using (true);
create policy "players read own profile" on public.profiles for select using (auth.uid() = id);
create policy "players read own bookings" on public.bookings for select using (auth.uid() = user_id);
