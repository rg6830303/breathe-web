-- Blocked slots: admin closes courts for maintenance, events, weather etc.
-- This is the Supabase (Postgres) side of the dual-write. The canonical
-- store is the Turso libSQL `blocked_slots` table created in db-init; this
-- mirror exists so admin reports can be run from Postgres if needed.

CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date    DATE NOT NULL,
  slot_time    TIME,                       -- NULL = entire day
  court_number INT CHECK (court_number BETWEEN 1 AND 9),  -- NULL = all courts
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_date
  ON public.blocked_slots (slot_date);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.blocked_slots;
CREATE POLICY "service_role_only" ON public.blocked_slots
  USING (auth.role() = 'service_role');
