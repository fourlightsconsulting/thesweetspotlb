// Meta ads results (Marketing API Insights), parsed into ad_performance
// rows. Pure, so the website's tests check it. Ported from Thirty's
// _shared/metaInsights.ts: ad level, one row per ad, day, publisher and
// placement, with the ad set and campaign named on each row. Reach isn't
// requested: it can't be added up across days or placements.

export const GRAPH_VERSION = "v21.0";

export const INSIGHTS_FIELDS = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "account_currency",
  "date_start",
  "spend",
  "impressions",
  "clicks",
  "inline_link_clicks",
  "actions",
  "action_values",
  // A field of its own, not an action: ad-led Instagram profile visits.
  "instagram_profile_visits",
].join(",");

export type MetaAction = { action_type?: string; value?: string | number };

export type MetaInsightsRow = {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  account_currency?: string;
  date_start?: string;
  publisher_platform?: string;
  platform_position?: string;
  spend?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  inline_link_clicks?: string | number;
  instagram_profile_visits?: string | number;
  actions?: MetaAction[];
  action_values?: MetaAction[];
};

/**
 * The action types for each result, best first. The first one present wins
 * and they're never added up: Meta reports one purchase as the pixel's, the
 * "omni" one and the plain one at once.
 */
export const RESULT_ACTIONS = {
  purchases: ["offsite_conversion.fb_pixel_purchase", "omni_purchase", "purchase"],
  add_to_cart: ["offsite_conversion.fb_pixel_add_to_cart", "omni_add_to_cart", "add_to_cart"],
  initiate_checkout: [
    "offsite_conversion.fb_pixel_initiate_checkout",
    "omni_initiated_checkout",
    "initiate_checkout",
  ],
  landing_page_views: ["landing_page_view"],
  // Click-to-WhatsApp and Messenger conversations started.
  messaging_started: [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
  ],
  video_views: ["video_view"],
} as const;

type ResultColumn = keyof typeof RESULT_ACTIONS;

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toCount = (value: unknown) => {
  const n = toNumber(value);
  return n === null ? null : Math.round(n);
};

/** The first present candidate's value. */
export function pickAction(actions: MetaAction[] | undefined, candidates: readonly string[]) {
  if (!Array.isArray(actions)) return null;
  for (const type of candidates) {
    const found = actions.find((a) => a.action_type === type);
    if (found) return toNumber(found.value);
  }
  return null;
}

export type AdRow = {
  day: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  publisher: string;
  placement: string;
  spend_cents: number;
  impressions: number | null;
  clicks: number | null;
  link_clicks: number | null;
  landing_page_views: number | null;
  add_to_cart: number | null;
  initiate_checkout: number | null;
  purchases: number | null;
  purchase_value_cents: number | null;
  messaging_started: number | null;
  video_views: number | null;
  profile_visits: number | null;
};

/** One Insights row as an ad_performance row; null when it has no ad or day. */
export function parseAdRow(row: MetaInsightsRow): AdRow | null {
  if (!row.ad_id || !row.date_start) return null;
  const result = (column: ResultColumn) => {
    const value = pickAction(row.actions, RESULT_ACTIONS[column]);
    return value === null ? null : Math.round(value);
  };
  const purchaseValue = pickAction(row.action_values, RESULT_ACTIONS.purchases);
  return {
    day: row.date_start,
    campaign_id: row.campaign_id ?? "",
    campaign_name: row.campaign_name ?? "",
    adset_id: row.adset_id ?? "",
    adset_name: row.adset_name ?? "",
    ad_id: row.ad_id,
    ad_name: row.ad_name ?? "",
    // Never guessed: a row without them is kept apart, not folded in elsewhere.
    publisher: row.publisher_platform?.trim() || "unknown",
    placement: row.platform_position?.trim() || "unknown",
    spend_cents: Math.round((toNumber(row.spend) ?? 0) * 100),
    impressions: toCount(row.impressions),
    clicks: toCount(row.clicks),
    link_clicks: toCount(row.inline_link_clicks),
    landing_page_views: result("landing_page_views"),
    add_to_cart: result("add_to_cart"),
    initiate_checkout: result("initiate_checkout"),
    purchases: result("purchases"),
    purchase_value_cents: purchaseValue === null ? null : Math.round(purchaseValue * 100),
    messaging_started: result("messaging_started"),
    video_views: result("video_views"),
    profile_visits: toCount(row.instagram_profile_visits),
  };
}

export const adRowKey = (r: AdRow) =>
  [r.day, r.campaign_id, r.adset_id, r.ad_id, r.publisher, r.placement].join("|");

/** "act_123" from "123" or "act_123"; the bare id is what's stored. */
export const accountPath = (id: string) =>
  id.trim().startsWith("act_") ? id.trim() : `act_${id.trim()}`;
export const bareAccountId = (id: string) => id.trim().replace(/^act_/, "");

/** The ad-level, per-day, per-placement insights URL for [since, until]. */
export function insightsUrl(o: { accountId: string; since: string; until: string }) {
  const params = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since: o.since, until: o.until }),
    fields: INSIGHTS_FIELDS,
    breakdowns: "publisher_platform,platform_position",
    limit: "200",
  });
  return `https://graph.facebook.com/${GRAPH_VERSION}/${accountPath(o.accountId)}/insights?${params}`;
}
