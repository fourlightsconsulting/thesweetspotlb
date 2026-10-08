import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// The customer directory's filters, shared by the page and the CSV export.

export const segments = [
  { value: "", label: "Everyone" },
  { value: "repeat", label: "Came back (2+ orders)" },
  { value: "new", label: "New this month" },
  { value: "quiet", label: "Gone quiet (45+ days)" },
  { value: "marketing", label: "Happy to hear from us" },
] as const;

export type Segment = (typeof segments)[number]["value"];

export type CustomerFilters = { q: string; segment: Segment };

export function readFilters(
  params: Record<string, string | string[] | undefined>,
): CustomerFilters {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const segment = segments.some((s) => s.value === params.segment)
    ? (params.segment as Segment)
    : "";
  return { q, segment };
}

const DAY = 86_400_000;

export function customerQuery(db: SupabaseClient<Database>, { q, segment }: CustomerFilters) {
  let query = db
    .from("customer_summaries")
    .select("*", { count: "exact" })
    .order("last_order_at", { ascending: false, nullsFirst: false });

  if (q) {
    const digits = q.replace(/\D/g, "").replace(/^(00961|961|0)/, "");
    query =
      digits.length >= 3 && /^[\d\s+()-]+$/.test(q)
        ? query.like("phone", `%${digits}%`)
        : query.ilike("name", `%${q.replace(/[%_,()]/g, " ")}%`);
  }
  const now = Date.now();
  if (segment === "repeat") query = query.gte("orders", 2);
  if (segment === "new")
    query = query.gte("first_order_at", new Date(now - 30 * DAY).toISOString());
  if (segment === "quiet")
    query = query.lt("last_order_at", new Date(now - 45 * DAY).toISOString());
  if (segment === "marketing") query = query.not("marketing_opt_in_at", "is", null);
  return query;
}
