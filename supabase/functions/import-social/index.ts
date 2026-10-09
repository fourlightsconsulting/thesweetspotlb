// import-social: Instagram and Facebook page numbers into insight_rows,
// every 6 hours. Asks one day at a time over the last 7 days and merges, so
// a figure Instagram withheld on one pass is filled in by a later one.
// Answers { ok, skipped } until META_ADS_TOKEN and META_PAGE_ID are set (the
// Instagram account is the one linked to the page, or META_IG_USER_ID).
// Ported from Thirty's import-social-insights.
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
  facebookRow,
  igNodeUrl,
  igSeriesUrl,
  igTotalsUrl,
  type InsightRow,
  type InsightsResponse,
  instagramRow,
  pageInsightsUrl,
  pageNodeUrl,
  readSeries,
  readTotals,
} from "../_shared/social.ts";

const LOOKBACK_DAYS = 7;

async function graphGet(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return ((await response.json().catch(() => null)) ?? {
    error: { message: `HTTP ${response.status}` },
  }) as InsightsResponse & Record<string, unknown>;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false }, 405);
  const db = serviceClient();
  if (!(await fromRunJob(request, db))) return json({ ok: false }, 401);

  const token = Deno.env.get("META_ADS_TOKEN")?.trim();
  const pageId = Deno.env.get("META_PAGE_ID")?.trim();
  if (!token || !pageId) return json({ ok: true, skipped: "not_configured" });

  const job = await readRequest(request);
  const today = beirutToday();
  const until = job.until ?? today;
  const since = job.since ?? addDays(until, -(LOOKBACK_DAYS - 1));
  const warnings: string[] = [];
  const instagram: InsightRow[] = [];
  const facebook: InsightRow[] = [];

  try {
    // The page gives its own token (its insights need it) and its Instagram account.
    const page = await graphGet(pageNodeUrl(pageId), token);
    if (page.error) return json({ ok: false, stage: "page", error: page.error.message }, 502);
    const pageToken = typeof page.access_token === "string" ? page.access_token : token;
    const linked = page.instagram_business_account as { id?: string } | undefined;
    const igId = Deno.env.get("META_IG_USER_ID")?.trim() || linked?.id || "";

    let followersToday: number | null = null;
    if (igId) {
      const node = await graphGet(igNodeUrl(igId), token);
      if (node.error) warnings.push(`instagram account: ${node.error.message}`);
      else if (typeof node.followers_count === "number") followersToday = node.followers_count;
    } else warnings.push("No Instagram account is linked to the page");

    for (let day = since; day <= until; day = addDays(day, 1)) {
      const next = addDays(day, 1);
      if (igId) {
        const [series, totals] = await Promise.all([
          graphGet(igSeriesUrl(igId, day, next), token),
          graphGet(igTotalsUrl(igId, day, next), token),
        ]);
        if (series.error || totals.error)
          warnings.push(`instagram ${day}: ${(series.error ?? totals.error)?.message}`);
        else
          instagram.push(
            instagramRow({
              accountId: igId,
              day,
              series: readSeries(series),
              totals: readTotals(totals),
              followersToday: day === today ? followersToday : null,
            }),
          );
      }
      const fb = await graphGet(pageInsightsUrl(pageId, day, next), pageToken);
      if (fb.error) warnings.push(`facebook ${day}: ${fb.error.message}`);
      else facebook.push(facebookRow({ pageId, day, series: readSeries(fb) }));
    }

    const key = (r: InsightRow) => `${r.report}|${r.day}|${r.dim1}`;
    const rows = { instagram: lastByKey(instagram, key), facebook: lastByKey(facebook, key) };
    if (job.dryRun)
      return json({
        ok: true,
        dry_run: true,
        since,
        until,
        instagram: rows.instagram.slice(0, 2),
        facebook: rows.facebook.slice(0, 2),
        warnings,
      });

    for (const source of ["instagram", "facebook"] as const) {
      if (rows[source].length === 0) continue;
      const { error } = await db.rpc("merge_insight_rows", {
        p_source: source,
        p_rows: rows[source],
      });
      if (error) return json({ ok: false, stage: `write:${source}`, error: error.message }, 500);
    }
    return json({
      ok: true,
      since,
      until,
      instagram: rows.instagram.length,
      facebook: rows.facebook.length,
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
