# Performance & database operations

## Current state (verified)

- **DB:** Supabase Postgres, **Transaction pooler** (`...pooler.supabase.com:6543`).
  `/api/health/db` reports `pooled: true`, `connectMs: ~3` — queries round-trip in
  ~3 ms because the Vercel functions and the database are colocated in US-East
  (`iad1` ↔ `aws-1-us-east-1`).
- **Pool:** one postgres.js pool per warm instance, `max: 3`, `idle_timeout: 30s`,
  `prepare: false` (required for the pooler). Far under the pooler's 200-client
  free-tier ceiling even with many simultaneous users.
- The database will **not** be flooded or shut down by concurrent users + admin.

The only remaining latency is **serverless cold starts** (Hobby plan): a function
unused for a few minutes takes ~0.3–1 s to wake on the next request. Two
mitigations are in place / available:

## 1. Admin tab caching (shipped)

`lib/admin-cache.ts` caches each admin tab's data in memory for the session.
Re-opening a tab renders its last data instantly and revalidates in the
background ("stale-while-revalidate"), so only the very first open of a tab can
feel a cold start.

## 2. Keep-warm pinger (you set up, 2 minutes, free)

Keep the busiest functions warm with a free external scheduler:

1. Go to **https://cron-job.org** (free) and create an account.
2. Add cron jobs, each **every 5 minutes**, method **GET**:
   - `https://breathepickleball.in/api/warm` — warms the DB connection + a function.
   - `https://breathepickleball.in/api/slots?date=today` *(use the real date, or
     just `/api/warm` is enough)* — warms the public booking path.
3. Save. That's it — the app stays warm during opening hours, so customers and the
   owner rarely hit a cold start.

> Vercel Hobby crons run only once per day, which is why this uses an external
> pinger. If you upgrade to Vercel Pro, you can schedule these in `vercel.json`
> instead.

## 3. (Optional, biggest win) Move Supabase to Mumbai — `ap-south-1`

Today both app and DB are in US-East, so DB queries are fast (~3 ms) but the
*first byte* of each page travels US↔India (~150 ms). Putting **both** in Mumbai
removes that too. This requires a new Supabase project + a data migration:

### Plan

1. **Create the new project**
   - Supabase → New project → Region **South Asia (Mumbai) ap-south-1**.
   - Wait for it to provision; note its connection details.

2. **Export the current data** (from the existing US project)
   - Supabase dashboard → Database → **Backups**, or run `pg_dump` against the
     `POSTGRES_URL_NON_POOLING` (direct, `:5432`) connection:
     ```
     pg_dump "postgresql://postgres:PWD@db.<old-ref>.supabase.co:5432/postgres" \
       --no-owner --no-privileges -Fc -f breathe.dump
     ```

3. **Import into the new Mumbai project**
   ```
   pg_restore --no-owner --no-privileges \
     -d "postgresql://postgres:PWD@db.<new-ref>.supabase.co:5432/postgres" breathe.dump
   ```
   (Or copy table-by-table via the SQL editor if `pg_dump` isn't handy.)

4. **Point the app at the new DB**
   - In Vercel, replace these env vars with the **new Mumbai project's** values
     (use the **Transaction pooler / :6543** string for `POSTGRES_URL`):
     `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`,
     `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` /
     `SUPABASE_ANON_KEY` / publishable + secret keys.

5. **Move the Vercel region to Mumbai too**
   - `vercel.json` → `"regions": ["bom1"]` (and/or Project → Settings → Functions
     → Region → Mumbai). Now app **and** DB are both in `bom1`/`ap-south-1`.

6. **Verify** `/api/health/db` → `pooled: true`, low `connectMs`, and confirm a
   test booking + login + admin tabs work, then decommission the old project.

> Do this during a quiet window; bookings made between export and cutover would
> need re-importing, so ideally pause new bookings briefly.
