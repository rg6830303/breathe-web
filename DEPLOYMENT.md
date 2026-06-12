# Breathe Pickleball — Deployment & Operations

This one codebase powers **two Vercel deployments** from the same repo:

| Purpose | Domain | Who sees it |
| --- | --- | --- |
| Public website + player portal | `https://www.breathepickleball.in` | Everyone |
| Admin / owner console | `https://breathe-web-six.vercel.app` (or `admin.breathepickleball.in`) | Owner only |

The admin console is **hidden (404) on the public domain** and only reachable on
the configured admin host. This is enforced in `middleware.ts` via
`NEXT_PUBLIC_ADMIN_HOST`.

---

## 1. Separate the admin portal onto its own domain

You can do this with **one Vercel project** (recommended — simplest) by adding
both domains and setting env vars so each behaves correctly. There are two valid
setups:

### Option A — single project, two domains (recommended)
1. In the Vercel project → **Settings → Domains**, add both:
   - `www.breathepickleball.in` (primary, public)
   - `breathe-web-six.vercel.app` (already there) — this stays the admin host
     (or add `admin.breathepickleball.in` and use that).
2. **Settings → Environment Variables** (Production):
   - `NEXT_PUBLIC_SITE_URL = https://www.breathepickleball.in`
   - `NEXT_PUBLIC_ADMIN_HOST = breathe-web-six.vercel.app`
     (or `admin.breathepickleball.in` if you add that domain)
3. Redeploy. Result:
   - `breathepickleball.in/admin` → **404** (invisible to the public)
   - `breathe-web-six.vercel.app/admin` → admin login + console
   - Player login/signup/dashboard work on **both**, but customers only ever
     see the public domain.

### Option B — two separate Vercel projects
Deploy the same repo twice. On the **admin** project set
`NEXT_PUBLIC_ADMIN_HOST` to its own host; on the **public** project set
`NEXT_PUBLIC_ADMIN_HOST` to a value that is NOT its host (so `/admin` 404s).
Both must share the same `TURSO_DATABASE_URL`, `SESSION_SECRET`, and Gmail vars
so data + sessions are consistent.

> The public-facing "Admin login" link has been removed from the player login
> screen, so the admin entry point is not advertised anywhere on the public site.

---

## 2. Google "No information is available for this page"

This happens when Google can't crawl/index the page. Fixed in code:
- `app/robots.ts` → serves `/robots.txt` (allows the site, disallows admin/api)
- `app/sitemap.ts` → serves `/sitemap.xml`
- `metadataBase`, canonical, Open Graph, and JSON-LD now use
  `NEXT_PUBLIC_SITE_URL` (your real domain) instead of the Vercel URL.

**After deploying, do this once:**
1. Set `NEXT_PUBLIC_SITE_URL = https://www.breathepickleball.in` in Vercel and redeploy.
2. Go to **Google Search Console** → add/verify the `breathepickleball.in`
   property (DNS TXT or the HTML-tag method).
3. **Sitemaps** → submit `https://www.breathepickleball.in/sitemap.xml`.
4. **URL Inspection** → enter the homepage → **Request indexing**.
5. Indexing typically takes a few days. "No information available" disappears
   once Googlebot successfully fetches the page (confirm with "Test live URL").

> Make sure your domain DNS points the apex/`www` at Vercel and that there is no
> leftover `Disallow: /` or password protection on the deployment (Vercel
> "Deployment Protection" must be **off** for the public domain, or Googlebot
> gets a login wall → exactly this symptom).

---

## 3. Email (Gmail SMTP, no company-domain mailbox)

Because you use a **plain Gmail account** (no Google Workspace on
`breathepickleball.in`), email is sent **From your Gmail address** and the
business address is used as **Reply-To**. Sending "From" a non-verified
`@breathepickleball.in` address via Gmail SMTP is what makes mail land in spam.

### Required env vars (Production)
```
GMAIL_USER=yourclubgmail@gmail.com
GMAIL_APP_PASSWORD=<16-char app password>   # from https://myaccount.google.com/apppasswords (2FA required)
ADMIN_EMAIL=yourclubgmail@gmail.com          # where booking notifications go
NEXT_PUBLIC_SITE_URL=https://www.breathepickleball.in
# optional:
REPLY_TO_EMAIL=breathepickleball@gmail.com   # shown as Reply-To only
```
Do **not** set `GMAIL_FROM` to a non-Gmail address — it's ignored unless it
equals `GMAIL_USER`.

### Staying out of spam with a Gmail-only setup
The code already adds the right transactional headers (List-Unsubscribe,
Auto-Submitted), aligns the envelope sender with the authenticated Gmail
account, and uses branded HTML + plain-text alternatives. The remaining levers
are operational:
1. From `/admin/diagnostics`, send a test to your own Gmail and to a second
   provider (e.g. Outlook). When it lands, click **"Not spam"** / move it to
   Inbox once — Gmail learns the sender reputation fast for low volume.
2. Keep volume low and content non-spammy (already the case for transactional
   booking/reset mail).
3. **Best long-term fix (optional):** if you later add Google Workspace for
   `breathepickleball.in`, set `GMAIL_USER` to that mailbox and add **SPF**,
   **DKIM**, and **DMARC** DNS records — that gives full domain alignment and
   effectively eliminates spam-foldering. With a free Gmail you cannot add DKIM
   for your own domain, which is the one limitation of this setup.

### Verifying delivery
- `/admin/diagnostics` → "Send test email" returns the real SMTP result/code.
- Password reset: `/forgot-password` → enter a **registered** user's email.
  (For security it always says "if an account exists…", but it only actually
  sends when the email matches a real user in the DB — so test with a real
  signed-up account.)
- Booking confirmation + admin notification fire on a completed booking.

---

## 4. Vercel Database Branching (Turso / Neon / Supabase)

If your Vercel deployments fail during the "Provisioning Integrations" phase or build phase due to a database branch issue, it is typically caused by naming restrictions or quota limits.

### Common Root Causes
1. **Invalid characters in Git branch name:** Database providers like Turso and Neon have strict naming requirements (only lowercase letters, numbers, and hyphens are allowed; no slashes `/`, underscores `_`, or uppercase letters). When Vercel automatically attempts to create a database branch matching Git branches like `claude/breathe-pickleball-ui-tOvOK`, the database creation fails and blocks the deployment.
2. **Branch limits reached:** Most free tiers limit the number of active database branches (e.g. max 10 database branches). When the limit is reached, Vercel fails to provision a new branch, blocking the deployment.

### Recommended Resolutions
To resolve this issue thoroughly so deployments run reliably:

1. **Disable database branching in the Vercel Integration (Recommended):**
   - Go to your Vercel Dashboard and select the **breathe-web** project.
   - Go to **Settings > Integrations**.
   - Click **Manage** on your database integration (e.g., Turso or Neon).
   - Toggle **"Enable database branching"** or **"Enable preview database branching"** to **OFF**.
   - This prevents Vercel from trying to automatically create a database branch for every Git branch, allowing preview deployments to deploy instantly and share the main database credentials (or a single dedicated development/preview database).

2. **Renaming Git Branches:**
   - If you want database branching enabled, avoid using slashes (`/`), underscores (`_`), or capital letters in your Git branch names.
   - Use clean, hyphen-separated branch names (e.g., `feature-login` or `claude-db-hotfix` instead of `feature/login` or `claude/db_hotfix`).

3. **Delete Unused Branches:**
   - Log in to your database provider's console (e.g. Turso, Neon, or Supabase).
   - Manually delete old, stale preview database branches that are no longer active to free up slots.

