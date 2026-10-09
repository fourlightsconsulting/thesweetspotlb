// GA4 and Search Console, parsed into insight_rows, plus Google Ads cost by
// campaign (read through GA4, so no Ads API developer token is needed).
// Pure, so the website's tests check it. Ported from Thirty's
// _shared/googleInsights.ts.
//
// Only what Google alone knows is imported: the website's own records count
// visits, carts and orders more completely than GA4 (which ad blockers
// hide), so GA4 adds location, time on page, landing pages and audience;
// Search Console adds what people searched for.

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

export type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

// ─── Signing in as the service account ────────────────────────────────────

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const utf8 = (text: string) => new TextEncoder().encode(text);

function pemToDer(pem: string) {
  const body = pem.replace(/-----(BEGIN|END) [^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** The signed JWT a service account trades for an access token (RFC 7523). */
export async function signServiceAccountJwt(
  account: ServiceAccount,
  scopes: string[],
  now = Math.floor(Date.now() / 1000),
) {
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: account.client_email,
    scope: scopes.join(" "),
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(utf8(JSON.stringify(header)))}.${base64url(utf8(JSON.stringify(claims)))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(unsigned));
  return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

// ─── GA4 ──────────────────────────────────────────────────────────────────

export type Ga4Report = "overview" | "geo" | "page" | "landing" | "source" | "audience";

/** GA4 metric → our name for it. */
const GA4_METRICS: Record<string, string> = {
  sessions: "sessions",
  totalUsers: "users",
  newUsers: "new_users",
  engagedSessions: "engaged_sessions",
  userEngagementDuration: "engagement_seconds",
  screenPageViews: "views",
  keyEvents: "key_events",
};

export const GA4_REPORTS: Record<
  Ga4Report,
  { dimensions: string[]; metrics: string[]; snapshotDays?: number }
> = {
  overview: {
    dimensions: ["date"],
    metrics: [
      "sessions",
      "totalUsers",
      "newUsers",
      "engagedSessions",
      "userEngagementDuration",
      "screenPageViews",
      "keyEvents",
    ],
  },
  geo: {
    dimensions: ["date", "country", "city"],
    metrics: ["sessions", "totalUsers", "newUsers", "engagedSessions", "keyEvents"],
  },
  page: {
    dimensions: ["date", "pagePath"],
    metrics: ["screenPageViews", "totalUsers", "userEngagementDuration"],
  },
  landing: {
    dimensions: ["date", "landingPage"],
    metrics: ["sessions", "engagedSessions", "userEngagementDuration", "keyEvents"],
  },
  source: {
    dimensions: ["date", "sessionSource", "sessionMedium"],
    metrics: ["sessions", "engagedSessions", "keyEvents"],
  },
  // Google withholds small groups, and one day is always small here: a
  // 90-day snapshot, filed under its last day.
  audience: {
    dimensions: ["userAgeBracket", "userGender"],
    metrics: ["totalUsers", "sessions", "engagedSessions", "keyEvents"],
    snapshotDays: 90,
  },
};

export const GA4_PAGE_SIZE = 100_000;

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The days a report reads: its own 90 for a snapshot, else the import's. */
export function ga4Window(report: Ga4Report, since: string, until: string) {
  const days = GA4_REPORTS[report].snapshotDays;
  return days ? { since: addDays(until, -(days - 1)), until } : { since, until };
}

export function ga4Request(report: Ga4Report, since: string, until: string, offset = 0) {
  const spec = GA4_REPORTS[report];
  const window = ga4Window(report, since, until);
  return {
    dateRanges: [{ startDate: window.since, endDate: window.until }],
    dimensions: spec.dimensions.map((name) => ({ name })),
    metrics: spec.metrics.map((name) => ({ name })),
    limit: GA4_PAGE_SIZE,
    offset,
  };
}

export type Ga4Response = {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
};

export type InsightRow = {
  day: string;
  dim1: string;
  dim2: string;
  dim3: string;
  metrics: Record<string, number | null>;
};

const numberOf = (value: string | undefined) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** `20261005` → `2026-10-05`. */
const isoFromGa4 = (value: string) =>
  /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : null;

/** One page of a GA4 report. A snapshot is filed under its window's last day. */
export function parseGa4(response: Ga4Response, until: string): InsightRow[] {
  const dims = (response.dimensionHeaders ?? []).map((h) => h.name);
  const metrics = (response.metricHeaders ?? []).map((h) => h.name);
  const dateAt = dims.indexOf("date");
  const out: InsightRow[] = [];
  for (const row of response.rows ?? []) {
    const values = (row.dimensionValues ?? []).map((v) => v.value ?? "");
    const day = dateAt >= 0 ? isoFromGa4(values[dateAt]) : until;
    if (!day) continue;
    const rest = values.filter((_, i) => i !== dateAt);
    const parsed: InsightRow = {
      day,
      dim1: rest[0] ?? "",
      dim2: rest[1] ?? "",
      dim3: rest[2] ?? "",
      metrics: {},
    };
    metrics.forEach((name, i) => {
      const ours = GA4_METRICS[name];
      if (ours) parsed.metrics[ours] = numberOf(row.metricValues?.[i]?.value);
    });
    out.push(parsed);
  }
  return out;
}

/** Google Ads cost per campaign and day, as GA4 sees it (Ads must be linked to GA4). */
export function adsCostRequest(since: string, until: string) {
  return {
    dateRanges: [{ startDate: since, endDate: until }],
    dimensions: [
      { name: "date" },
      { name: "sessionGoogleAdsCampaignId" },
      { name: "sessionGoogleAdsCampaignName" },
    ],
    metrics: [
      { name: "advertiserAdCost" },
      { name: "advertiserAdClicks" },
      { name: "advertiserAdImpressions" },
    ],
    limit: GA4_PAGE_SIZE,
  };
}

export type AdsCostRow = {
  day: string;
  campaign_id: string;
  campaign_name: string;
  spend_cents: number;
  clicks: number | null;
  impressions: number | null;
};

/** The cost report as ad_performance rows (platform google). */
export function parseAdsCost(response: Ga4Response): AdsCostRow[] {
  const out: AdsCostRow[] = [];
  for (const row of response.rows ?? []) {
    const [date, campaignId, campaignName] = (row.dimensionValues ?? []).map((v) => v.value ?? "");
    const day = isoFromGa4(date);
    // "(not set)" is traffic that wasn't a Google Ads click.
    if (!day || !campaignId || campaignId === "(not set)") continue;
    const [cost, clicks, impressions] = (row.metricValues ?? []).map((v) => numberOf(v.value));
    out.push({
      day,
      campaign_id: campaignId,
      campaign_name: campaignName === "(not set)" ? "" : campaignName,
      spend_cents: Math.round((cost ?? 0) * 100),
      clicks: clicks === null ? null : Math.round(clicks),
      impressions: impressions === null ? null : Math.round(impressions),
    });
  }
  return out;
}

// ─── Search Console ───────────────────────────────────────────────────────

export type GscReport = "total" | "query" | "page" | "country" | "device";

export const GSC_REPORTS: Record<GscReport, string[]> = {
  total: ["date"],
  query: ["date", "query"],
  page: ["date", "page"],
  country: ["date", "country"],
  device: ["date", "device"],
};

export const GSC_PAGE_SIZE = 25_000;

export const gscRequest = (report: GscReport, since: string, until: string, startRow = 0) => ({
  startDate: since,
  endDate: until,
  dimensions: GSC_REPORTS[report],
  rowLimit: GSC_PAGE_SIZE,
  startRow,
});

export type GscResponse = {
  rows?: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
};

/**
 * Search Console rows. Position is stored times impressions, so the average
 * over any rows is sum(position_sum) ÷ sum(impressions), as Google computes it.
 */
export function parseGsc(response: GscResponse): InsightRow[] {
  const out: InsightRow[] = [];
  for (const row of response.rows ?? []) {
    const [day, dim1] = row.keys ?? [];
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const impressions = row.impressions ?? 0;
    out.push({
      day,
      dim1: dim1 ?? "",
      dim2: "",
      dim3: "",
      metrics: {
        clicks: row.clicks ?? 0,
        impressions,
        position_sum: (row.position ?? 0) * impressions,
      },
    });
  }
  return out;
}

/** Works for domain ("sc-domain:thesweetspotlb.com") and URL-prefix properties. */
export const gscUrl = (site: string) =>
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
