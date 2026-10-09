// import-google: GA4 and Search Console into insight_rows, and Google Ads
// cost (through GA4) into ad_performance, daily.
//
// Signs in as a read-only service account (GOOGLE_SERVICE_ACCOUNT_JSON),
// added as a Viewer on the GA4 property (GA4_PROPERTY_ID) and a user on the
// Search Console property (SEARCH_CONSOLE_SITE). Re-reads a trailing window
// (GA4 settles in about two days, Search Console in three) and replaces it
// report by report. A backfill is run_job('google', '{"since","until"}');
// '{"dry_run": true}' reads without writing. Answers { ok, skipped } until
// all three are set. Ported from Thirty's import-google-insights.
import {
  addDays,
  beirutToday,
  fromRunJob,
  json,
  lastByKey,
  readRequest,
  serviceClient,
} from "../_shared/job.ts";
import {
  adsCostRequest,
  GA4_PAGE_SIZE,
  GA4_REPORTS,
  type Ga4Report,
  ga4Request,
  ga4Window,
  GOOGLE_SCOPES,
  type GscReport,
  GSC_PAGE_SIZE,
  GSC_REPORTS,
  gscRequest,
  gscUrl,
  type InsightRow,
  parseAdsCost,
  parseGa4,
  parseGsc,
  type ServiceAccount,
  signServiceAccountJwt,
} from "../_shared/google.ts";

const GA4_LOOKBACK_DAYS = 7;
const GSC_LOOKBACK_DAYS = 10;
const MAX_PAGES = 50;

class StageError extends Error {
  constructor(
    public stage: string,
    public detail: unknown,
  ) {
    super(stage);
  }
}

async function accessToken(account: ServiceAccount) {
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await signServiceAccountJwt(account, GOOGLE_SCOPES),
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token)
    throw new StageError(
      "sign-in",
      payload?.error_description ?? payload?.error ?? `HTTP ${response.status}`,
    );
  return payload.access_token as string;
}

async function post(url: string, token: string, body: unknown, stage: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.error)
    throw new StageError(stage, payload?.error?.message ?? `HTTP ${response.status}`);
  return payload;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false }, 405);
  const db = serviceClient();
  if (!(await fromRunJob(request, db))) return json({ ok: false }, 401);

  const accountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")?.trim();
  const propertyId = Deno.env.get("GA4_PROPERTY_ID")?.trim();
  const site = Deno.env.get("SEARCH_CONSOLE_SITE")?.trim();
  if (!accountJson || !propertyId || !site) return json({ ok: true, skipped: "not_configured" });
  let account: ServiceAccount;
  try {
    account = JSON.parse(accountJson);
    if (!account.client_email || !account.private_key) throw new Error();
  } catch {
    return json(
      {
        ok: false,
        stage: "config",
        error: "GOOGLE_SERVICE_ACCOUNT_JSON isn't a service account key",
      },
      500,
    );
  }

  const job = await readRequest(request);
  const until = job.until ?? addDays(beirutToday(), -1);
  const ga4Since = job.since ?? addDays(until, -(GA4_LOOKBACK_DAYS - 1));
  const gscSince = job.since ?? addDays(until, -(GSC_LOOKBACK_DAYS - 1));
  const ga4Url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const summary: Record<string, unknown> = {};
  const warnings: string[] = [];
  const rowKey = (r: InsightRow) => [r.day, r.dim1, r.dim2, r.dim3].join("\u0000");

  const write = async (
    source: "ga4" | "gsc",
    report: string,
    since: string,
    rows: InsightRow[],
  ) => {
    const unique = lastByKey(rows, rowKey);
    if (job.dryRun) {
      summary[`${source}/${report}`] = { rows: unique.length, sample: unique.slice(0, 2) };
      return;
    }
    const { data, error } = await db.rpc("replace_insight_rows", {
      p_source: source,
      p_report: report,
      p_since: since,
      p_until: until,
      p_rows: unique,
    });
    if (error) throw new StageError(`write:${source}/${report}`, error.message);
    summary[`${source}/${report}`] = data;
  };

  try {
    const token = await accessToken(account);

    for (const report of Object.keys(GA4_REPORTS) as Ga4Report[]) {
      const rows: InsightRow[] = [];
      for (let page = 0; ; page++) {
        if (page >= MAX_PAGES) throw new StageError(`ga4/${report}`, "Too many pages");
        const payload = await post(
          ga4Url,
          token,
          ga4Request(report, ga4Since, until, page * GA4_PAGE_SIZE),
          `ga4/${report}`,
        );
        rows.push(...parseGa4(payload, until));
        if ((payload.rows?.length ?? 0) < GA4_PAGE_SIZE) break;
      }
      // A snapshot replaces only the day it's filed under.
      const snapshot = Boolean(GA4_REPORTS[report].snapshotDays);
      await write("ga4", report, snapshot ? until : ga4Window(report, ga4Since, until).since, rows);
    }

    // Google Ads cost: only when Ads is linked to GA4, so a refusal is a warning.
    try {
      const payload = await post(ga4Url, token, adsCostRequest(ga4Since, until), "ads");
      const rows = lastByKey(parseAdsCost(payload), (r) => `${r.day}|${r.campaign_id}`);
      if (job.dryRun) summary.ads = { rows: rows.length, sample: rows.slice(0, 2) };
      else {
        const { data, error } = await db.rpc("replace_ad_performance", {
          p_platform: "google",
          p_account_id: `ga4:${propertyId}`,
          p_since: ga4Since,
          p_until: until,
          p_rows: rows,
        });
        if (error) throw new StageError("write:ads", error.message);
        summary.ads = data;
      }
    } catch (error) {
      if (error instanceof StageError && error.stage === "ads")
        warnings.push(`Google Ads cost: ${String(error.detail)}`);
      else throw error;
    }

    for (const report of Object.keys(GSC_REPORTS) as GscReport[]) {
      const rows: InsightRow[] = [];
      for (let page = 0; ; page++) {
        if (page >= MAX_PAGES) throw new StageError(`gsc/${report}`, "Too many pages");
        const payload = await post(
          gscUrl(site),
          token,
          gscRequest(report, gscSince, until, page * GSC_PAGE_SIZE),
          `gsc/${report}`,
        );
        rows.push(...parseGsc(payload));
        if ((payload.rows?.length ?? 0) < GSC_PAGE_SIZE) break;
      }
      await write("gsc", report, gscSince, rows);
    }

    return json({
      ok: true,
      dry_run: job.dryRun,
      ga4: { since: ga4Since, until },
      gsc: { since: gscSince, until },
      reports: summary,
      warnings,
    });
  } catch (error) {
    if (error instanceof StageError)
      return json(
        { ok: false, stage: error.stage, error: String(error.detail), reports: summary },
        502,
      );
    return json(
      {
        ok: false,
        stage: "exception",
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
