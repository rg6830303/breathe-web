-- New `notices` table introduced in group12. Lives alongside the legacy
-- `notice_board` table (migration 001) — the public site + admin tab now
-- read/write `notices`; `notice_board` is left in place for back-compat
-- (existing references in app/actions.ts still upsert into it for now).

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  category text check (category in ('daily', 'weekly', 'monthly')) default 'daily',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists notices_active_idx on public.notices (active, created_at desc);

-- RLS: public can read active notices; only service role can insert / update /
-- delete (admin actions sign requests with the service role key).
alter table public.notices enable row level security;
create policy "public reads active notices" on public.notices
  for select using (active = true);
