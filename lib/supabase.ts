import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// A safe fallback mock client using Proxy to prevent pre-render and bootstrap crashes
const mockSupabase = new Proxy({} as any, {
  get(target, prop) {
    if (prop === "auth") {
      return new Proxy({} as any, {
        get() {
          return () => Promise.resolve({ data: { user: null }, error: null });
        }
      });
    }
    return () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    });
  }
});

let supabaseClient: any = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (!url || !key) {
    console.warn("⚠️ Supabase credentials missing. Falling back to proxy mock.");
    return mockSupabase;
  }

  try {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseClient;
  } catch (err) {
    console.error("❌ Failed to initialize Supabase client:", err);
    return mockSupabase;
  }
}

export const supabase = getSupabase();

// When POSTGRES_URL is set, Supabase Postgres IS the primary database (via the
// lib/turso shim), so the legacy supabase-js REST mirror is redundant — disable
// it to avoid double-writes/conflicts. It stays available only as the Turso-era
// fallback mirror when running on libsql.
export const hasSupabase = Boolean(url && key) && !process.env.POSTGRES_URL;
