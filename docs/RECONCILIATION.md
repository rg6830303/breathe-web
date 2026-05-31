# Audit reconciliation — what's actually in this repo vs the May 2026 audit prompt

This document captures the reconciliation between the multi-group audit prompt that
was used to plan this sprint and the *actual* state of the codebase at the time of
the sprint. Future Claude/contributor sessions should read this before treating the
audit prompt as ground truth.

## Confirmed architecture (current — do not change without explicit ask)

- **Auth**: custom JWT via `jose` (`lib/auth.ts`), bcrypt password hashes, HttpOnly
  cookies `breathe_player_session` (player) and `breathe_admin_session` (admin),
  middleware verifies both at `middleware.ts`. Back-tested as of commit `dd24a49`.
- **DB split**:
  - **Turso** (libSQL) — primary source of truth for `users`, `admins`, `bookings`,
    `gallery_images`, `venue_config`. Schema seeded by `app/api/db-init/route.ts`.
  - **Supabase** — dual-write mirror only. Reads fall back to Supabase if Turso
    lookup misses (see `app/api/auth/login/route.ts`, `signup/route.ts`).
- **Object storage**: Vercel Blob (`@vercel/blob`) backing the gallery — *not*
  Supabase Storage.
- **Booking pipeline**: Razorpay create-order → verify-payment with HMAC sig check
  → Turso INSERT + Supabase dual-write → `notifications.notifyBookingConfirmed`
  fires email + Telegram via `waitUntil`.

## Where the audit prompt was wrong

| Audit claim | Reality |
|---|---|
| `@libsql/client` not in `package.json` | Present at `^0.17.3` |
| `bcryptjs`, `jose`, `react-dropzone` missing | All installed |
| Admin auth = `ADMIN_EMAIL` + `ADMIN_PASSWORD` env (demo password `breathe-admin`) | Admin is a real Turso row with bcrypt hash, seeded from env on first `db-init` call |
| Use `@supabase/ssr` for session cookies | Not used; we run our own JWT cookies |
| Gallery has no storage backend wired | `app/api/admin/gallery/route.ts` + Vercel Blob is fully wired |
| `stitch_breathe_pickleball_digital_arena/` is a leftover folder to `rm -rf` | That is the **name of the project root**. The nested folder of the same name (full of `breathe_pickleball_*` design mockup subfolders) is the leftover — leaving it per user instruction |

## Real bugs the audit missed

1. **No `court_number` column** in `bookings`. Court is virtualised by counting
   prior bookings at the same `(slot_date, slot_time)` via correlated subquery in
   `app/api/admin/bookings/route.ts`. Means "book court 2 specifically" is not
   honoured — whoever pays first becomes court 1.
2. **60-min slot overlap not enforced**. `/api/slots` checks exact-time match
   only. A 60-min booking at `07:00` doesn't prevent a second booking at `07:30`
   on the same court.
3. **GST stored inclusive in `amount_paid`**, then backed-out with magic 0.847
   multiplier in `app/api/admin/bookings/route.ts:69`. Should be split into
   `subtotal` / `gst` / `total` columns.
4. **`SESSION_SECRET` falls back** to a hard-coded dev string in `lib/auth.ts:5`
   if both `SESSION_SECRET` and `JWT_SECRET` are unset — should fail-fast in prod.

## Revised plan (this sprint)

Approved by user: "fix-and-add" mode — no Supabase Auth migration, keep custom
JWT, keep Vercel Blob gallery, keep Calendar in nav, fix the court bugs, commit
this reco file, auto-push each group after green build.

- **Group 0** — deps: install `@react-pdf/renderer`, `zod`, `react-day-picker`,
  `date-fns`; upgrade `@react-email/components` to latest.
- **Group 1** — auth hardening: rate-limits table + helper, Zod schemas on auth
  routes, refuse-to-boot if secret unset in prod, forgot-password +
  reset-password pages and API.
- **Group 2** — schema: add real `court_number`, `subtotal`, `gst`, `total`
  columns to `bookings`, 60-min overlap in `/api/slots`, add `notices` table.
- **Group 3** — player dashboard redesign: heatmap, favourite-time badge,
  upcoming vs history, profile edit.
- **Group 4** — admin: `/admin/customers/[id]`, `/admin/notices`,
  `/admin/settings`, today's-bookings panel on overview.
- **Group 5** — gallery polish: drag reorder, inline caption edit, active
  toggle, public-page lightbox.
- **Group 6** — booking confirmation PDF invoice + admin email.
- **Group 7** — coaching strip, booking page calendar + time-bands, security
  headers in `next.config.ts`.
- **Group 8** — smoke tests in `scripts/backtest.js`.

## Skipped from the audit (with reason)

- Supabase Auth + email OTP signup — would invalidate every back-tested user.
- Supabase Storage gallery bucket — Vercel Blob works and the API is in place.
- `profiles` table separate from `users` — `users` table already has `full_name`
  and `phone`; no need for the split.
- Dropping Calendar from main nav — user wants it kept.
- Deleting the nested `stitch_breathe_pickleball_digital_arena/` artifact — user
  wants it left.
- Rotating Supabase / Turso credentials — out of scope for code; user must do
  this in their dashboards.
