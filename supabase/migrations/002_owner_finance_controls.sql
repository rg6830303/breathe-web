do $$ begin
  create type public.finance_category as enum ('revenue', 'expense', 'adjustment');
exception when duplicate_object then null;
end $$;

create table if not exists public.pricing_rules (
  id serial primary key,
  label text not null,
  court_id int references public.courts(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.finance_entries (
  id serial primary key,
  entry_date date not null default current_date,
  category public.finance_category not null,
  label text not null,
  amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pricing_rules_touch_updated_at on public.pricing_rules;
create trigger pricing_rules_touch_updated_at
before update on public.pricing_rules
for each row execute function public.touch_notice_updated_at();

drop trigger if exists finance_entries_touch_updated_at on public.finance_entries;
create trigger finance_entries_touch_updated_at
before update on public.finance_entries
for each row execute function public.touch_notice_updated_at();

insert into public.pricing_rules (id, label, court_id, start_time, end_time, price, active)
values
  (1, 'Off peak', null, '06:00', '16:00', 600, true),
  (2, 'Standard', null, '16:00', '18:00', 750, true),
  (3, 'Prime time', null, '18:00', '21:00', 900, true),
  (4, 'Late play', null, '21:00', '23:00', 750, true)
on conflict (id) do update
set label = excluded.label,
    court_id = excluded.court_id,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    price = excluded.price,
    active = excluded.active;

create or replace function public.slot_price(p_start_time timestamptz, p_court_id int default null)
returns numeric
language plpgsql
stable
as $$
declare
  local_time time := (p_start_time at time zone 'Asia/Kolkata')::time;
  matched_price numeric;
begin
  select price into matched_price
  from public.pricing_rules
  where active = true
    and (court_id is null or court_id = p_court_id)
    and local_time >= start_time
    and local_time < end_time
  order by court_id nulls last
  limit 1;

  if matched_price is not null then
    return matched_price;
  end if;

  return case
    when extract(hour from p_start_time at time zone 'Asia/Kolkata') between 18 and 20 then 900
    when extract(hour from p_start_time at time zone 'Asia/Kolkata') between 6 and 15 then 600
    else 750
  end;
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

  base_amount := public.slot_price(p_start_time, p_court_id);
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

alter table public.pricing_rules enable row level security;
alter table public.finance_entries enable row level security;

create policy "pricing rules are public readable" on public.pricing_rules for select using (true);
