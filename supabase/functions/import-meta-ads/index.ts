// import-meta-ads: Meta ads spend and results into ad_performance, hourly.
//
// Re-reads the last 7 days each run (Meta keeps revising recent numbers for
// about three days) and replaces that window whole, so re-running is safe.
// A backfill is run_job('meta-ads', '{"since": "...", "until": "..."}');
// '{"dry_run": true}' reads without writing. Answers { ok, skipped } until
// META_ADS_TOKEN and META_AD_ACCOUNT_ID are set. Ported from Thirty.
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
  adRowKey,
  type AdRow,
  bareAccountId,
  insightsUrl,
  type MetaInsightsRow,
  parseAdRow,
} from "../_shared/meta-ads.ts";

const LOOKBACK_DAYS = 7;
/** A runaway cursor can't loop forever; a partial read is never written. */
const MAX_PAGES = 100;

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false }, 405);
  const db = serviceClient();
  if (!(await fromRunJob(request, db))) return json({ ok: false }, 401);

  const token = Deno.env.get("META_ADS_TOKEN")?.trim();
  const accountId = Deno.env.get("META_AD_ACCOUNT_ID")?.trim();
  if (!token || !accountId) return json({ ok: true, skipped: "not_configured" });

  const job = await readRequest(request);
  const until = job.until ?? beirutToday();
  const since = job.since ?? addDays(until, -(LOOKBACK_DAYS - 1));

  const rows: AdRow[] = [];
  const currencies = new Set<string>();
  let url: string | null = insightsUrl({ accountId, since, until });
  let pages = 0;
  try {
    while (url && pages < MAX_PAGES) {
      pages++;
      // The token goes in a header, never in our logs.
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.error)
        return json(
          { ok: false, stage: "meta", error: payload?.error?.message ?? `HTTP ${response.status}` },
          502,
        );
      for (const raw of (payload.data ?? []) as MetaInsightsRow[]) {
        if (raw.account_currency) currencies.add(raw.account_currency);
        const row = parseAdRow(raw);
        if (row) rows.push(row);
      }
      url = typeof payload.paging?.next === "string" ? payload.paging.next : null;
    }
    if (url) return json({ ok: false, stage: "paging", error: "Too many pages" }, 502);

    const unique = lastByKey(rows, adRowKey);
    const warnings = [...currencies]
      .filter((c) => c !== "USD")
      .map((c) => `Account currency is ${c}, not USD`);
    if (job.dryRun)
      return json({
        ok: true,
        dry_run: true,
        since,
        until,
        rows: unique.length,
        sample: unique.slice(0, 3),
        warnings,
      });

    const { data, error } = await db.rpc("replace_ad_performance", {
      p_platform: "meta",
      p_account_id: bareAccountId(accountId),
      p_since: since,
      p_until: until,
      p_rows: unique,
    });
    if (error) return json({ ok: false, stage: "write", error: error.message }, 500);
    return json({
      ok: true,
      since,
      until,
      imported: unique.length,
      pages,
      replaced: data,
      warnings,
    });
  } catch (error) {
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
