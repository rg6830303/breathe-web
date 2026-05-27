insert into public.courts (id, name, type)
values (1, 'Court 1', 'Indoor Premium'), (2, 'Court 2', 'Indoor Standard')
on conflict (id) do update set name = excluded.name, type = excluded.type;

insert into public.notice_board (title, content, type)
values
  ('Tonight: Court 1 prime slot', 'Two 7 PM openings are live for fast booking.', 'daily'),
  ('Weekly ladder', 'Registration closes Friday for the weekly ladder.', 'weekly'),
  ('Monthly neon cup', 'Early bird tournament passes are available at the desk.', 'monthly');

insert into public.pricing_rules (id, label, court_id, start_time, end_time, price, active)
values
  (1, 'Off peak', null, '06:00', '16:00', 600, true),
  (2, 'Standard', null, '16:00', '18:00', 750, true),
  (3, 'Prime time', null, '18:00', '21:00', 900, true),
  (4, 'Late play', null, '21:00', '23:00', 750, true)
on conflict (id) do update set
  label = excluded.label,
  court_id = excluded.court_id,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  price = excluded.price,
  active = excluded.active;
