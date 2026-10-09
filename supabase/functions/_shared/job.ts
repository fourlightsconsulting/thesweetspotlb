// What every scheduled job shares (Deno): the database client, the check
// that run_job() sent the request, answers, and date windows in Beirut time.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/** The secret key: SUPABASE_SERVICE_ROLE_KEY, or the first of the new SUPABASE_SECRET_KEYS. */
function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    return Object.values(keys)[0] ?? "";
  } catch {
    return "";
  }
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  return createClient(url, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** True when the request came from run_job() (it carries the shared secret). */
export async function fromRunJob(request: Request, db: SupabaseClient) {
  const secret = request.headers.get("x-job-secret") ?? "";
  if (secret.length < 32) return false;
  const { data, error } = await db.rpc("job_secret_ok", { p_secret: secret });
  return !error && data === true;
}

export type JobRequest = { since?: string; until?: string; dryRun: boolean };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** { since, until, dry_run } from run_job's body; anything missing uses the defaults. */
export async function readRequest(request: Request): Promise<JobRequest> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    since: typeof body.since === "string" && ISO_DATE.test(body.since) ? body.since : undefined,
    until: typeof body.until === "string" && ISO_DATE.test(body.until) ? body.until : undefined,
    dryRun: body.dry_run === true,
  };
}

export const beirutToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Beirut" });

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Keeps the last of rows sharing a key (a duplicate would fail the whole write). */
export const lastByKey = <T>(rows: T[], key: (row: T) => string) => [
  ...new Map(rows.map((row) => [key(row), row])).values(),
];
