import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { publishableKey, supabaseUrl } from "./env";

/**
 * The signed-in staff member's client (admin pages, server actions): their
 * session comes from cookies, so row level security applies to them. The
 * middleware keeps the session fresh; server components can't write cookies,
 * which is fine because they only read.
 */
export async function adminClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a server component: the middleware already refreshed the session.
        }
      },
    },
  });
}
