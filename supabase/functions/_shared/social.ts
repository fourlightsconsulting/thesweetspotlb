// Instagram and Facebook page numbers (Graph API), parsed into insight_rows.
// Pure, so the website's tests check it. Ported from Thirty's
// _shared/socialInsights.ts, where these were verified against the live API:
//
//  * Instagram answers in two shapes. reach and follower_count are a daily
//    series; the rest need metric_type=total_value and return one total for
//    the range. So the job asks one day at a time and files the row under
//    that day (which also avoids Instagram's end_time being a day off).
//  * Those daily totals are "in development": the same day can read a value
//    on one call and nothing on the next. Rows are merged, never replaced,
//    so a later pass fills a gap without erasing what an earlier one found.
//  * Instagram's account numbers include ad activity; there's no organic-only
//    split. Paid results are in ad_performance.
//  * Facebook pages are thin since Meta's 2024 changes: follows, engagement,
//    page views and actions are what still answer.

export const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const IG_SERIES_METRICS = ["reach", "follower_count"];
export const IG_TOTAL_METRICS = [
  "profile_views",
  "accounts_engaged",
  "total_interactions",
  "views",
  "likes",
  "comments",
  "saves",
  "shares",
  "replies",
  "website_clicks",
  "profile_links_taps",
];
export const FB_METRICS = [
  "page_follows",
  "page_daily_follows",
  "page_post_engagements",
  "page_views_total",
  "page_total_actions",
];

export type InsightsResponse = {
  data?: {
    name?: string;
    values?: { value?: unknown; end_time?: string }[];
    total_value?: { value?: unknown } | null;
  }[];
  error?: { message?: string; code?: number };
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** A one-day series response as { metric: value }. */
export function readSeries(response: InsightsResponse | null) {
  const out: Record<string, number | null> = {};
  for (const item of response?.data ?? [])
    if (item.name) out[item.name] = toNumber(item.values?.[0]?.value);
  return out;
}

/** A total_value response as { metric: value }. */
export function readTotals(response: InsightsResponse | null) {
  const out: Record<string, number | null> = {};
  for (const item of response?.data ?? [])
    if (item.name) out[item.name] = item.total_value ? toNumber(item.total_value.value) : null;
  return out;
}

export type InsightRow = {
  report: string;
  day: string;
  dim1: string;
  dim2?: string;
  dim3?: string;
  metrics: Record<string, number | null>;
};

/**
 * One Instagram day. The follower total is known only for today (the
 * account's current count); earlier days carry the day's new followers.
 */
export function instagramRow(o: {
  accountId: string;
  day: string;
  series: Record<string, number | null>;
  totals: Record<string, number | null>;
  followersToday?: number | null;
}): InsightRow {
  const { series, totals } = o;
  return {
    report: "account",
    day: o.day,
    dim1: o.accountId,
    metrics: {
      followers: o.followersToday ?? null,
      new_followers: series.follower_count ?? null,
      reach: series.reach ?? null,
      profile_views: totals.profile_views ?? null,
      views: totals.views ?? null,
      accounts_engaged: totals.accounts_engaged ?? null,
      interactions: totals.total_interactions ?? null,
      likes: totals.likes ?? null,
      comments: totals.comments ?? null,
      saves: totals.saves ?? null,
      shares: totals.shares ?? null,
      replies: totals.replies ?? null,
      website_clicks: totals.website_clicks ?? null,
      profile_link_taps: totals.profile_links_taps ?? null,
    },
  };
}

/** One Facebook page day; page_follows is the running total that day. */
export function facebookRow(o: {
  pageId: string;
  day: string;
  series: Record<string, number | null>;
}): InsightRow {
  const { series } = o;
  return {
    report: "page",
    day: o.day,
    dim1: o.pageId,
    metrics: {
      followers: series.page_follows ?? null,
      new_followers: series.page_daily_follows ?? null,
      interactions: series.page_post_engagements ?? null,
      page_views: series.page_views_total ?? null,
      actions: series.page_total_actions ?? null,
    },
  };
}

/** The Instagram series metrics for one day (since inclusive, until exclusive). */
export const igSeriesUrl = (igId: string, since: string, until: string) =>
  `${GRAPH}/${igId}/insights?${new URLSearchParams({
    metric: IG_SERIES_METRICS.join(","),
    period: "day",
    since,
    until,
  })}`;

/** The Instagram total_value metrics for one day. */
export const igTotalsUrl = (igId: string, since: string, until: string) =>
  `${GRAPH}/${igId}/insights?${new URLSearchParams({
    metric: IG_TOTAL_METRICS.join(","),
    metric_type: "total_value",
    period: "day",
    since,
    until,
  })}`;

/** The Instagram account now: followers. */
export const igNodeUrl = (igId: string) =>
  `${GRAPH}/${igId}?${new URLSearchParams({ fields: "id,username,followers_count" })}`;

/** The Facebook page: its own access token (for its insights) and linked Instagram account. */
export const pageNodeUrl = (pageId: string) =>
  `${GRAPH}/${pageId}?${new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id}",
  })}`;

/** The Facebook page's metrics for one day. */
export const pageInsightsUrl = (pageId: string, since: string, until: string) =>
  `${GRAPH}/${pageId}/insights?${new URLSearchParams({
    metric: FB_METRICS.join(","),
    period: "day",
    since,
    until,
  })}`;
