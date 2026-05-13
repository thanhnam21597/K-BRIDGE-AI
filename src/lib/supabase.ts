import { createClient } from "@supabase/supabase-js";

/**
 * Shared Supabase helper for both browser and server usage.
 * For this MVP we use anon key auth; for stricter production RLS control,
 * you can additionally provide SUPABASE_SERVICE_ROLE_KEY on server routes.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}

export function getSupabaseBrowserClient() {
  assertSupabaseEnv();
  return createClient(supabaseUrl!, supabaseAnonKey!);
}

export function getSupabaseServerClient() {
  assertSupabaseEnv();
  const key = supabaseServiceRoleKey || supabaseAnonKey!;
  return createClient(supabaseUrl!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
