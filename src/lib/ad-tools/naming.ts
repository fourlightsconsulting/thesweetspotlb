import { type Choice, slug } from "./links";

// Ad names, ported from Thirty's adNaming.ts. They're data, not labels: the
// platforms copy them into each ad's link ({{campaign.name}}, {{ad.name}}),
// and the dashboards match our orders to campaigns and ads by them.
//
// Two separators: "_" between fields, "-" between words inside a field, so
// name.split("_") always gives the same parts in the same places. Every
// field is required; an empty one becomes "none" rather than shifting the
// rest.

export const platforms: Choice[] = [
  { value: "fb", note: "Meta (Facebook and Instagram)" },
  { value: "gg", note: "Google Ads" },
  { value: "tt", note: "TikTok" },
];

export const objectives: Choice[] = [
  { value: "sales", note: "orders on the website" },
  { value: "msg", note: "WhatsApp or Instagram chats" },
  { value: "traffic", note: "visits to the website" },
  { value: "awareness", note: "reach: people who see it" },
  { value: "engagement", note: "likes, comments, follows" },
];

export const stages: Choice[] = [
  { value: "prospect", note: "people who don’t know the shop yet" },
  { value: "retarget", note: "visited the site, or engaged on Instagram" },
  { value: "loyalty", note: "customers, for the next order" },
  { value: "brand", note: "awareness, no order expected" },
];

/** Meta's “conversion location”: where the result happens. */
export const conversionLocations: Choice[] = [
  { value: "website", note: "the website" },
  { value: "whatsapp", note: "WhatsApp" },
  { value: "instagram-dms", note: "Instagram messages" },
  { value: "messenger", note: "Messenger" },
  { value: "calls", note: "phone calls" },
  { value: "on-ad", note: "on the ad itself" },
  { value: "instagram", note: "the Instagram profile" },
  { value: "facebook", note: "the Facebook page" },
];

/** Meta's “performance goal”: what delivery optimises for. */
export const performanceGoals: Choice[] = [
  { value: "purchase", note: "orders" },
  { value: "landing-page-views", note: "page loads" },
  { value: "link-clicks", note: "link taps" },
  { value: "conversations", note: "chats started" },
  { value: "engagement", note: "post engagement" },
  { value: "video-views", note: "video views" },
  { value: "profile-visits", note: "Instagram profile visits" },
  { value: "reach", note: "people reached" },
];

export const formats: Choice[] = [
  { value: "reel", note: "vertical video" },
  { value: "static", note: "one photo" },
  { value: "carousel", note: "several photos to swipe" },
  { value: "story", note: "made for stories" },
  { value: "ugc", note: "a customer’s or creator’s video" },
  { value: "catalog", note: "from the menu catalog" },
];

export const ctas: Choice[] = [
  { value: "ordernow", note: "Order now" },
  { value: "whatsapp", note: "Send WhatsApp message" },
  { value: "learnmore", note: "Learn more" },
  { value: "directions", note: "Get directions" },
];

/** What a creative is about. One word each: creative ids are read by position. */
export const pillars: Choice[] = [
  { value: "product", note: "one item up close" },
  { value: "offer", note: "a code or a deal" },
  { value: "new", note: "a launch or a weekly special" },
  { value: "making", note: "behind the counter" },
  { value: "people", note: "customers, team, reviews" },
  { value: "moment", note: "a season or an occasion" },
  { value: "brand", note: "the shop, its look and feel" },
];

export const audienceTypes: Choice[] = [
  { value: "geo", note: "people around the shop (a radius)" },
  { value: "rt", note: "retargeting: site visitors or engagers" },
  { value: "eng", note: "engaged on Instagram or Facebook" },
  { value: "cus", note: "a customer list" },
  { value: "lal", note: "lookalike of a list" },
  { value: "int", note: "interests" },
  { value: "bro", note: "broad, no targeting" },
];

export const audienceScopes: Choice[] = [
  { value: "2km", note: "within 2 km" },
  { value: "5km", note: "within 5 km" },
  { value: "10km", note: "within 10 km" },
  { value: "7d", note: "last 7 days" },
  { value: "30d", note: "last 30 days" },
  { value: "90d", note: "last 90 days" },
  { value: "180d", note: "last 180 days" },
  { value: "1pct", note: "lookalike 1%" },
  { value: "3pct", note: "lookalike 3%" },
  { value: "all", note: "no window" },
];

export const ratios: Choice[] = [
  { value: "9x16", note: "Reels, Stories, TikTok" },
  { value: "4x5", note: "Feed" },
  { value: "1x1", note: "Square, carousel frames" },
  { value: "16x9", note: "Landscape" },
];

export const fileTypes = ["mp4", "mov", "jpg", "png"] as const;

/** One field: slugged, "none" when empty so the positions never shift. */
const field = (value: string) => slug(value) || "none";

/** "7" → "07": creative numbers are two digits, so 261001 splits back into 2610 + 01. */
const twoDigits = (value: string | number) =>
  (String(value).replace(/\D/g, "") || "1").padStart(2, "0").slice(-2);

export const CREATIVE_NUMBER_MAX = 99;

/** "2026-10" (a month input) → "2610". */
export function yymm(monthInput: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthInput.trim());
  return m ? `${m[1].slice(2)}${m[2]}` : "";
}

/** fb_sales_launch_2610 */
export const campaignName = (p: {
  platform: string;
  objective: string;
  initiative: string;
  month: string;
}) => [p.platform, p.objective, p.initiative, p.month].map(field).join("_");

/** prospect_website_purchase_geo001_v1 */
export const adSetName = (p: {
  stage: string;
  location: string;
  goal: string;
  audience: string;
  version: string;
}) =>
  [
    field(p.stage),
    field(p.location),
    field(p.goal),
    field(p.audience),
    `v${String(p.version).replace(/\D/g, "") || "1"}`,
  ].join("_");

/** 261001-01-product-lotus-crepe_reel_ordernow */
export const adName = (p: { creative: string; format: string; cta: string }) =>
  [p.creative || "none", field(p.format), field(p.cta)].join("_");

/**
 * 261001-01-product-lotus-crepe: the month and number name the idea, the
 * second number the cut (version), then the pillar and what it shows. The
 * subject comes last because it's the only part with hyphens of its own.
 */
export const creativeId = (p: {
  month: string;
  number: string | number;
  version: string | number;
  pillar: string;
  subject: string;
}) =>
  [
    `${field(p.month)}${twoDigits(p.number)}`,
    twoDigits(p.version),
    field(p.pillar),
    field(p.subject),
  ]
    .join("-")
    .slice(0, 100);

/** 261001-01-product-lotus-crepe_9x16.mp4, or _1x1-f2.jpg for a carousel's second frame. */
export function assetFileName(p: { creative: string; ratio: string; frame?: string; ext: string }) {
  const frame = String(p.frame ?? "").replace(/\D/g, "");
  return `${p.creative}_${field(p.ratio)}${frame ? `-f${frame}` : ""}.${p.ext}`;
}

/** geo + 1 → geo001. */
export function audienceId(type: string, number: string | number) {
  const kind = slug(type);
  const digits = String(number).replace(/\D/g, "");
  return kind ? `${kind}${(digits || "1").padStart(3, "0")}` : "";
}

/** fb_geo001_tripoli-mina_5km: what to call it in the platform's audience list. */
export const audienceName = (p: {
  platform: string;
  id: string;
  descriptor: string;
  scope: string;
}) => [p.platform, p.id, p.descriptor, p.scope].map(field).join("_");

/** The next free number after the highest taken (by a pattern's first group). */
function nextNumber(pattern: RegExp, taken: Iterable<string>) {
  let highest = 0;
  for (const value of taken) {
    const m = pattern.exec(value);
    if (m) highest = Math.max(highest, Number(m[1]));
  }
  return highest + 1;
}

export const nextAudienceNumber = (type: string, taken: Iterable<string>) =>
  slug(type) ? nextNumber(new RegExp(`^${slug(type)}(\\d+)$`), taken) : 1;

/** The next idea number in a month (2610 → 03 after 01 and 02). */
export const nextCreativeNumber = (month: string, taken: Iterable<string>) =>
  /^\d{4}$/.test(month) ? nextNumber(new RegExp(`^${month}(\\d{2})-`), taken) : 1;

/** The next cut of one idea (261001-03 after -01 and -02). */
export const nextCreativeVersion = (
  month: string,
  number: string | number,
  taken: Iterable<string>,
) =>
  /^\d{4}$/.test(month)
    ? nextNumber(new RegExp(`^${month}${twoDigits(number)}-(\\d{2})-`), taken)
    : 1;

/**
 * What to paste into each platform so its ads tag their own links: the
 * platform fills in the names, which the dashboards then match.
 */
export const linkTemplates = {
  /** Meta: Ads Manager → ad → Tracking → URL parameters. */
  meta: "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}",
  /** TikTok: ad → Tracking → URL parameters. */
  tiktok:
    "utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_term=__AID_NAME__&utm_content=__CID_NAME__",
  /** Google Ads has no name macro: the campaign's name is typed into its Final URL suffix. */
  google: (campaign: string) =>
    `utm_source=google&utm_medium=cpc&utm_campaign=${encodeURIComponent(campaign || "none")}`,
};
