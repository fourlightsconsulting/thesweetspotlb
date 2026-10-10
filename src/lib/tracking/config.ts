import { STAFF_COOKIE } from "@/lib/staff-cookie";

// The ad platforms' tags, each on when its id is set (build variables, so
// they're in the page; see .env.production). Off in development unless
// NEXT_PUBLIC_TRACKING_IN_DEV is "true", and in the team's own browsers, so
// testing never counts as real visits.

export const tags = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "",
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID?.trim() ?? "",
  /** "AW-123456789" */
  adsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "",
  /** The purchase conversion's label, from Google Ads → Goals. */
  adsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL?.trim() ?? "",
  debug: process.env.NEXT_PUBLIC_TRACKING_DEBUG === "true",
};

export const tagsAllowed =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_TRACKING_IN_DEV === "true";

/** A browser that has opened the admin (it sets the staff cookie for the whole domain). */
const staffBrowser = () =>
  typeof document !== "undefined" &&
  document.cookie.split("; ").some((c) => c.startsWith(`${STAFF_COOKIE}=`));

export const metaOn = () => tagsAllowed && tags.metaPixelId !== "" && !staffBrowser();
export const ga4On = () => tagsAllowed && tags.ga4Id !== "" && !staffBrowser();
export const adsOn = () => tagsAllowed && tags.adsId !== "" && !staffBrowser();

export function debug(source: string, ...details: unknown[]) {
  if (tags.debug || process.env.NODE_ENV !== "production") console.debug(`[${source}]`, ...details);
}
