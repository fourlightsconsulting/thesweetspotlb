import type { Metadata } from "next";
import { beirutDate, daysAgo, money, when } from "@/components/admin/format";
import { Help } from "@/components/admin/help";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { requireStaff } from "@/server/admin/session";
import { JobControls, SpendCard } from "./connection-forms";

export const metadata: Metadata = { title: "Connections" };

type Run = {
  id: number;
  job: string;
  queued_at: string;
  finished_at: string | null;
  outcome: "pending" | "ok" | "skipped" | "failed" | "unknown";
  response: unknown;
  error: string | null;
  request: unknown;
};

const jobs = [
  {
    key: "meta-ads",
    name: "Meta ads",
    what: "Spend and results for each ad, by day and placement. Hourly, over the last 7 days.",
    needs: "META_ADS_TOKEN and META_AD_ACCOUNT_ID",
    backfill: true,
  },
  {
    key: "social",
    name: "Instagram & Facebook",
    what: "Followers, reach, views and interactions, by day. Every 6 hours.",
    needs: "META_ADS_TOKEN and META_PAGE_ID",
    backfill: true,
  },
  {
    key: "google",
    name: "Google Analytics, Search Console & Ads cost",
    what: "Visitors’ location, pages and audience, what people searched, and Google Ads spend. Daily.",
    needs: "GOOGLE_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID and SEARCH_CONSOLE_SITE",
    backfill: true,
  },
  {
    key: "sweep",
    name: "Retries",
    what: "Resends Meta events (and WhatsApp alerts, if set up) that didn’t go through at the time. Every 10 minutes.",
    needs: "",
    backfill: false,
  },
] as const;

const outcomeLabel: Record<Run["outcome"], { text: string; tone: string }> = {
  ok: { text: "Worked", tone: "bg-accent-soft text-accent" },
  skipped: { text: "Not set up yet", tone: "bg-wait-soft text-wait" },
  failed: { text: "Failed", tone: "bg-bad-soft text-bad" },
  unknown: { text: "No answer", tone: "bg-bad-soft text-bad" },
  pending: { text: "Running", tone: "" },
};

/** What a run did, in a few words, from the job's answer. */
function summary(run: Run) {
  const r = (run.response ?? {}) as Record<string, unknown>;
  if (run.outcome === "failed" || run.outcome === "unknown")
    return run.error ?? (typeof r.error === "string" ? r.error : "No details");
  if (run.outcome === "skipped") return "Waiting for its settings";
  if (run.outcome === "pending") return "Started";
  const parts: string[] = [];
  if (typeof r.imported === "number") parts.push(`${r.imported} rows`);
  if (typeof r.instagram === "number") parts.push(`Instagram ${r.instagram} days`);
  if (typeof r.facebook === "number") parts.push(`Facebook ${r.facebook} days`);
  if (r.reports && typeof r.reports === "object")
    parts.push(`${Object.keys(r.reports).length} reports`);
  const alerts = r.alerts as { sent?: number; failed?: number } | undefined;
  if (alerts?.sent || alerts?.failed)
    parts.push(
      `${alerts.sent ?? 0} alerts sent${alerts.failed ? `, ${alerts.failed} failed` : ""}`,
    );
  const meta = r.meta as { orders?: number; events?: number } | undefined;
  if (meta?.orders || meta?.events)
    parts.push(`Meta: ${meta.orders ?? 0} orders, ${meta.events ?? 0} events`);
  if (Array.isArray(r.warnings) && r.warnings.length) parts.push(`${r.warnings.length} warnings`);
  return parts.join(" · ") || "Nothing to do";
}

export default async function ConnectionsPage() {
  await requireStaff("manager");
  // Fill in runs that finished since the scheduler last looked.
  await serviceClient()?.rpc("reconcile_jobs");
  const db = await adminClient();
  const since = daysAgo(90);
  const [runs, spend] = await Promise.all([
    db
      .from("job_runs")
      .select("id, job, queued_at, finished_at, outcome, response, error, request")
      .order("queued_at", { ascending: false })
      .limit(60),
    db
      .from("ad_performance")
      .select("id, day, campaign_name, spend_cents, note")
      .eq("platform", "manual")
      .gte("day", since)
      .order("day", { ascending: false }),
  ]);
  const list = (runs.data ?? []) as Run[];

  return (
    <>
      <PageHeader title="Connections" />
      <div className="grid gap-4 wide:grid-cols-2">
        {jobs.map((job) => {
          const latest = list.find((r) => r.job === job.key);
          const lastGood = list.find((r) => r.job === job.key && r.outcome === "ok");
          const warnings = (
            (latest?.response as { warnings?: string[] } | null)?.warnings ?? []
          ).slice(0, 3);
          const label = latest ? outcomeLabel[latest.outcome] : null;
          return (
            <section key={job.key} className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base font-bold">
                  {job.name}
                  <Help>{job.what}</Help>
                </h2>
                {label && <span className={`pill ${label.tone}`}>{label.text}</span>}
              </div>
              {latest ? (
                <div className="text-[13px]">
                  <p>
                    Last run {when(latest.queued_at)}: {summary(latest)}
                  </p>
                  {lastGood && lastGood.id !== latest.id && (
                    <p className="text-muted">Last worked {when(lastGood.queued_at)}</p>
                  )}
                  {warnings.map((w) => (
                    <p key={w} className="text-wait">
                      {w}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted">Hasn’t run yet.</p>
              )}
              {latest?.outcome === "skipped" && job.needs && (
                <p className="rounded-[10px] bg-wait-soft px-3 py-2 text-[13px]">
                  Needs {job.needs}, set as Supabase function secrets.
                </p>
              )}
              <JobControls job={job.key} canBackfill={job.backfill} />
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        <SpendCard
          today={beirutDate()}
          rows={(spend.data ?? []).map((row) => ({
            id: row.id,
            day: row.day,
            channel: row.campaign_name,
            amount: money(row.spend_cents),
            note: row.note,
          }))}
        />
      </div>

      <section className="card mt-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 text-base font-bold">Recent runs</h2>
        {list.length === 0 ? (
          <p className="px-5 py-3 text-muted">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-line text-[13px]">
            {list.slice(0, 25).map((run) => {
              const label = outcomeLabel[run.outcome];
              const range = run.request as { since?: string; until?: string } | null;
              return (
                <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2">
                  <span className="w-28 text-muted tabular-nums">{when(run.queued_at)}</span>
                  <span className="w-28 font-semibold">
                    {jobs.find((j) => j.key === run.job)?.name.split(",")[0] ?? run.job}
                  </span>
                  <span className={`pill ${label.tone}`}>{label.text}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {range?.since ? `${range.since} → ${range.until} · ` : ""}
                    {summary(run)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
