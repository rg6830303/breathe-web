import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

// A robust, chainable mock client to prevent any server-side crashes when Supabase is not configured.
const mockSupabase = new Proxy({}, {
  get(target, prop) {
    if (prop === "auth") {
      return {
        signUp: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      };
    }
    const fn = () => mockSupabase;
    fn.then = (resolve: any) => resolve({ data: [], error: null });
    return fn;
  }
}) as any;

export function getSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Supabase service role variables missing, returning safe mock client.");
    return mockSupabase;
  }
  try {
    serviceClient ??= createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return serviceClient;
  } catch (err) {
    console.error("Failed to initialize Supabase service client, returning mock.", err);
    return mockSupabase;
  }
}

export function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("Supabase anon variables missing, returning safe mock client.");
    return mockSupabase;
  }
  try {
    anonClient ??= createClient(url, key);
    return anonClient;
  } catch (err) {
    console.error("Failed to initialize Supabase anon client, returning mock.", err);
    return mockSupabase;
  }
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
