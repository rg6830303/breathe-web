# Supabase Setup

Run the migration in `supabase/migrations/001_initial_schema.sql`, then run `supabase/seed.sql`.

To enable the outbound Google Sheets mirror from Postgres, set the custom database setting used by the trigger:

```sql
alter database postgres set app.google_apps_script_webapp_url = 'https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec';
```

The app also calls the same web app URL from the checkout route when `GOOGLE_APPS_SCRIPT_WEBAPP_URL` is configured.
