// Tracking links: a page on the website with campaign tags, so visits and
// orders from a post, a bio, a broadcast or a printed QR code show up under
// their own name in the dashboards (src/app/admin/(app)/dashboard).
// Ported from Thirty's utmLinks.ts.

/** Lowercase words joined by hyphens: the one spelling the tags use. */
export function slug(value: string, max = 100) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/**
 * A campaign, content or term tag: like slug, but underscores stay, since
 * ad names (fb_sales_launch_2610) use them to separate their parts.
 */
export const tagValue = (value: string, max = 100) =>
  value
    .split("_")
    .map((part) => slug(part))
    .filter(Boolean)
    .join("_")
    .slice(0, max)
    .replace(/[-_]+$/, "");

export type LinkTags = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  /** The link's own id (utm_id), also its short address. */
  id: string;
};

/** The destination with the tags added (empty ones left out); "" if it isn't a web address. */
export function taggedUrl(destination: string, tags: LinkTags) {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  const set = (key: string, value?: string) => {
    if (value?.trim()) url.searchParams.set(key, value.trim());
  };
  set("utm_source", tags.source);
  set("utm_medium", tags.medium);
  set("utm_campaign", tags.campaign);
  set("utm_content", tags.content);
  set("utm_term", tags.term);
  set("utm_id", tags.id);
  return url.toString();
}

/** campaign-source-01, or the next number free. */
export function suggestLinkId(campaign: string, source: string, taken: Iterable<string>) {
  const used = new Set(taken);
  const stem = [slug(campaign, 40), slug(source, 30)].filter(Boolean).join("-") || "link";
  for (let n = 1; ; n++) {
    const id = `${stem}-${String(n).padStart(2, "0")}`;
    if (!used.has(id)) return id;
  }
}

/** "story" → "story-v2", "story-v2" → "story-v3": the next version of a post. */
export function bumpVersion(value: string) {
  const m = /^(.*?)-v(\d+)$/.exec(value);
  if (m) return `${m[1]}-v${Number(m[2]) + 1}`;
  return value ? `${value}-v2` : "";
}

/** The short address a QR code carries: <site>/l/<id>. */
export const shortLink = (siteUrl: string, id: string) => `${siteUrl}/l/${id}`;

export type Choice = { value: string; note: string };

/**
 * utm_medium, and the dashboard channel each lands in (traffic_channel() in
 * the database decides; keep these in step with it).
 */
export const mediums: Choice[] = [
  { value: "social", note: "Organic social: posts, stories, reels, your bio" },
  { value: "qr", note: "QR & print: flyers, table tents, packaging, receipts" },
  { value: "whatsapp", note: "Messaging: WhatsApp broadcasts, status, chats" },
  { value: "sms", note: "Messaging: text messages" },
  { value: "email", note: "Messaging: email" },
  { value: "referral", note: "Referral: a partner’s website or page" },
  { value: "paid", note: "Paid: an ad the Ad names tab can’t tag" },
];

const printed = new Set([
  "flyer",
  "table-tent",
  "packaging",
  "menu-card",
  "receipt",
  "poster",
  "sticker",
]);

/** The usual medium for a source, until one is picked: a flyer is print, WhatsApp is messaging. */
export function mediumFor(source: string) {
  const s = slug(source);
  if (printed.has(s) || /qr|flyer|poster|print/.test(s)) return "qr";
  if (s === "whatsapp") return "whatsapp";
  if (s === "sms" || s === "email") return s;
  return "social";
}

/** Suggestions for utm_source: where the link is placed. */
export const sources = [
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
  "google",
  "flyer",
  "table-tent",
  "packaging",
  "menu-card",
  "receipt",
  "toters",
];

/** Where a link can go on the website. */
export const destinations = [
  { value: "home", label: "Home page" },
  { value: "order", label: "Order page (the menu)" },
  { value: "item", label: "One item, opened" },
  { value: "about", label: "About" },
  { value: "custom", label: "Another address" },
] as const;

export type Destination = (typeof destinations)[number]["value"];

/** The page for a destination choice, in a language. */
export function destinationUrl(
  siteUrl: string,
  choice: Destination,
  lang: "en" | "ar",
  extra: { item?: string; custom?: string } = {},
) {
  switch (choice) {
    case "home":
      return `${siteUrl}/${lang}`;
    case "order":
      return `${siteUrl}/${lang}/order`;
    case "item":
      return extra.item
        ? `${siteUrl}/${lang}/order?${new URLSearchParams({ item: extra.item })}`
        : "";
    case "about":
      return `${siteUrl}/${lang}/about`;
    case "custom":
      return (extra.custom ?? "").trim();
  }
}
