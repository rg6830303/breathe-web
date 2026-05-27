# Breathe Web

Production-grade Next.js App Router build for Breathe Pickleball: public site, live court booking matrix, player dashboard, owner notice-board console, Supabase schema, Google Sheets sync, Telegram alerts, and Resend email receipts.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Postgres/Auth
- Resend React Email templates
- Telegram Bot API
- Vercel deployment config

## Routes

- `/` - branded home page and filtered notice board
- `/book` - live Court 1/Court 2 half-hour slot matrix using `GET /api/slots`
- `/dashboard` - player metrics using `GET /api/player/dashboard`
- `/admin` - notice-board editorial forms backed by secured server actions
- `/admin` - owner console for bookings, pricing rules, CSV import/export, and daily finance tracking
- `/api/bookings/checkout` - verifies and inserts bookings through an atomic Supabase RPC
- `/api/admin/export/bookings` - Excel/Google Sheets friendly booking ledger CSV export
- `/api/admin/export/finances` - finance and profit/loss CSV export
- `/api/admin/import/bookings` - load booking edits back from Excel/Google Sheets CSV
- `/api/integration/sheets-sync` - inbound Google Sheets edits protected by `X-Integration-Key`

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
RESEND_API_KEY=
SHEETS_INTEGRATION_KEY=
GOOGLE_APPS_SCRIPT_WEBAPP_URL=
ADMIN_EMAIL=
```

## Supabase

Apply:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_owner_finance_controls.sql`
- `supabase/seed.sql`

The bookings table includes the requested GIST exclusion constraint:

```sql
constraint no_overlapping_court_bookings exclude using gist (
  court_id with =,
  tstzrange(start_time, end_time) with &&
) where (status <> 'cancelled')
```

## Local Development

```bash
npm install
npm run dev
```

The UI includes demo fallback data when Supabase variables are not present, so the screens remain previewable before production services are connected.

## Owner Spreadsheet Workflow

1. Open `/admin`.
2. Download booking or finance CSV files for Excel / Google Sheets.
3. Edit bookings, rates, expenses, adjustments, and revenue records.
4. Import booking CSV edits back through the admin form, or post structured sheet changes to `/api/integration/sheets-sync` with `X-Integration-Key`.
