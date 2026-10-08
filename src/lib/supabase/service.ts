import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publishableKey, supabaseUrl } from "./env";

// Server-side clients that don't act for a signed-in person.

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * The secret key: bypasses row level security. Only for what the website's
 * server does on everyone's behalf (placing orders, checking codes, writing
 * events). Null until it's configured.
 */
export function serviceClient(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !key) return null;
  return createClient<Database>(supabaseUrl, key, options);
}

/** The publishable key: reads exactly what any visitor may read (the live menu, public settings). */
export function publicClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !publishableKey) return null;
  return createClient<Database>(supabaseUrl, publishableKey, options);
}
