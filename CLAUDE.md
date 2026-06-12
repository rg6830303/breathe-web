# Breathe Pickleball — Project & Security Rules

Next.js 15 (App Router) + TypeScript + Tailwind. Court-booking app for a
pickleball business: public marketing site, player portal (`/dashboard`), admin
console (`/admin`), Razorpay payments, web-push notifications.

## Architecture
- **DB layer:** `lib/turso.ts` exposes `turso.execute({ sql, args })` with `?`
  placeholders. It runs against **Supabase Postgres when `POSTGRES_URL` is set**,
  else **Turso/libsql**. Postgres translation (`?`→`$n`, `INSERT OR IGNORE`→
  `ON CONFLICT DO NOTHING`, `strftime`) happens in the shim — keep SQL written in
  the SQLite-ish style and it works on both. Schema lives in `lib/db/ensure.ts`
  (portable TEXT/BIGINT/INTEGER types).
- **Auth:** JWT (`jose`) in httpOnly cookies; `lib/auth.ts` `getSession()` /
  `getAdminSession()`. Passwords bcrypt (cost 12).
- **Notifications:** `lib/push.ts` (web-push) + `lib/notify-store.ts` (inbox) +
  `lib/notifications.tsx` (email/Telegram hub).

---

## Security rules (apply to every change) — based on Taha Jaffri's checklist

1. **Secrets:** Only in env (`process.env.*`). `.env*` is git-ignored; keep
   `.env.example` updated. Never put secrets in `NEXT_PUBLIC_*` or client code.
   Never return secrets in API responses.
2. **Rate limiting:** Use `checkRateLimit(key, max, windowMs)` (`lib/rate-limit`).
   Auth routes 6/15min; sensitive POST (orders, redeem, push-subscribe)
   ~20–30/min. Always return `429` + `Retry-After`. Surface the message in the UI.
3. **Input validation:** Validate on the server with Zod (`lib/validation.ts`).
   Check type, length, enum, required. Reject with `400`.
4. **Auth/permissions:** Verify identity AND ownership on every request
   (`row.user_id === session.id`). Admin routes call `getAdminSession()`.
   bcrypt cost ≥ 12; JWT secret ≥ 32 chars; short admin session.
5. **SQL:** Always parameterized (`{ sql, args }`). Never string-concat user
   input into SQL. Never return raw DB errors to the client.
6. **CORS:** Same-origin only (Next API routes). No wildcard CORS.
7. **HTTP headers:** Set in `next.config.ts` — CSP, HSTS, `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, Referrer-Policy; `poweredByHeader: false`.
8. **File uploads:** Validate MIME + extension + size server-side; store under a
   UUID filename in Vercel Blob (`app/api/admin/gallery`). Never trust client name.
9. **Errors:** Generic message to client ("Something went wrong"); full context
   `console.error` server-side. Correct status codes (4xx vs 5xx).
10. **Dependencies:** `npm audit` after installs; fix high/critical; pin via
    `package-lock.json`.
11. **XSS:** No `dangerouslySetInnerHTML` with user content. The only uses are
    app-controlled (theme script, JSON-LD). Keep it that way.
12. **Deploy gate:** `.env` not committed; secrets set in Vercel; HTTPS enforced;
    rate limiting on public endpoints; DB not publicly exposed.

## Pre-deploy checklist
- [ ] `npx tsc --noEmit` and `npm run build` pass
- [ ] No new secret in client code / `NEXT_PUBLIC_*`
- [ ] New public endpoints have rate limiting + server validation + ownership checks
- [ ] New uploads validated (MIME/ext/size) + UUID-named
- [ ] `.env.example` updated for any new env var
