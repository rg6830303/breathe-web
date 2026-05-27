insert into public.courts (id, name, type)
values (1, 'Court 1', 'Indoor Premium'), (2, 'Court 2', 'Indoor Standard')
on conflict (id) do update set name = excluded.name, type = excluded.type;

insert into public.notice_board (title, content, type)
values
  ('Tonight: Court 1 prime slot', 'Two 7 PM openings are live for fast booking.', 'daily'),
  ('Weekly ladder', 'Registration closes Friday for the weekly ladder.', 'weekly'),
  ('Monthly neon cup', 'Early bird tournament passes are available at the desk.', 'monthly');
