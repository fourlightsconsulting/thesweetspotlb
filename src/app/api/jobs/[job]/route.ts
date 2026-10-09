import { serviceClient } from "@/lib/supabase/service";
import { sendOrderAlerts } from "@/server/order-alerts";
import { relayPendingToMeta } from "@/server/tracking";

// POST /api/jobs/sweep: started by the database's scheduler every 10 minutes
// (run_job('sweep'), with the shared secret). Sends WhatsApp alerts still
// waiting and whatever Meta hasn't had yet. The imports from Meta and Google
// run as Supabase functions instead (supabase/functions), where they have
// the time and memory for it.

const answer = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request, { params }: RouteContext<"/api/jobs/[job]">) {
  const db = serviceClient();
  const secret = request.headers.get("x-job-secret") ?? "";
  if (!db || secret.length < 32) return answer({ ok: false }, 401);
  const { data: ok } = await db.rpc("job_secret_ok", { p_secret: secret });
  if (ok !== true) return answer({ ok: false }, 401);

  const { job } = await params;
  if (job !== "sweep") return answer({ ok: false, error: "Unknown job" }, 404);
  try {
    const [alerts, meta] = await Promise.all([sendOrderAlerts(), relayPendingToMeta()]);
    return answer({ ok: true, alerts, meta });
  } catch (error) {
    return answer(
      { ok: false, error: error instanceof Error ? error.message : "The sweep failed" },
      500,
    );
  }
}
