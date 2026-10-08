import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publishableKey, supabaseUrl } from "./env";

let client: SupabaseClient<Database> | null = null;

/** The admin's browser client (live order updates, photo uploads), sharing the session cookies. */
export function browserClient(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(supabaseUrl, publishableKey);
  return client;
}
