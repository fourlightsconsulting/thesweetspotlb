// Content the admin edits without a deploy (site_settings rows). The same
// schemas check what the admin saves and what the website reads; anything
// malformed falls back to the built-in default, so a bad row can't break a page.
import { z } from "zod";

const localized = (max: number) =>
  z.object({ en: z.string().trim().min(1).max(max), ar: z.string().trim().min(1).max(max) });

/** The scrolling phrases under the home hero. */
export const homeTickerSchema = z.object({
  enabled: z.boolean(),
  phrases: z.array(localized(40)).min(1).max(8),
});
export type HomeTicker = z.infer<typeof homeTickerSchema>;

/** Where the welcome popup's button goes. */
export const popupTargetSchema = z.union([
  z.literal("order"),
  z.templateLiteral(["item:", z.string().regex(/^[a-z0-9-]{1,64}$/)]),
  z.templateLiteral(["category:", z.string().regex(/^[a-z0-9-]{1,64}$/)]),
  z.url({ protocol: /^https$/ }),
]);
export type PopupTarget = z.infer<typeof popupTargetSchema>;

/** An offer shown once to new visitors; it collects nothing. */
export const welcomePopupSchema = z.object({
  enabled: z.boolean(),
  title: localized(70),
  body: localized(240),
  /** A discount code shown with a copy button. */
  code: z
    .string()
    .regex(/^[A-Z0-9]{3,24}$/)
    .nullable()
    .optional(),
  cta: z.object({ label: localized(30), target: popupTargetSchema }),
  delay_seconds: z.int().min(0).max(60),
  /** Shown again to the same visitor after this many days. */
  repeat_after_days: z.int().min(1).max(365),
  pages: z.enum(["all", "home"]),
});
export type WelcomePopup = z.infer<typeof welcomePopupSchema>;

/**
 * The website's own visitor records (/api/e). Switched off from the admin if
 * the database nears the free plan's 500 MB; the ad platforms' tags carry on.
 */
export const trackingSchema = z.object({ first_party: z.boolean() });
export type TrackingSettings = z.infer<typeof trackingSchema>;

export const siteSettingKeys = {
  homeTicker: "home_ticker",
  welcomePopup: "welcome_popup",
  tracking: "tracking",
} as const;

/** The home ticker's phrases until the admin sets them (same as the seed). */
export const defaultHomeTicker: HomeTicker = {
  enabled: true,
  phrases: [
    { en: "Order now", ar: "اطلب الآن" },
    { en: "Pickup or delivery", ar: "استلام أو توصيل" },
    { en: "Open late", ar: "مفتوحين للسهرة" },
    { en: "Ready in 10–15 min", ar: "جاهز خلال 10–15 دقيقة" },
    { en: "20% off · code SWEET20", ar: "خصم 20% · الرمز SWEET20" },
  ],
};

export const defaultWelcomePopup: WelcomePopup = {
  enabled: false,
  title: { en: "20% off your first order", ar: "خصم 20% على أول طلب" },
  body: {
    en: "Order online for pickup or delivery and use the code at checkout.",
    ar: "اطلب أونلاين استلام أو توصيل واستعمل الرمز عند الدفع.",
  },
  code: "SWEET20",
  cta: { label: { en: "Order now", ar: "اطلب الآن" }, target: "order" },
  delay_seconds: 4,
  repeat_after_days: 7,
  pages: "all",
};

export type SiteSettings = {
  homeTicker: HomeTicker;
  welcomePopup: WelcomePopup;
  tracking: TrackingSettings;
};

/** Reads the stored rows, keeping the default for anything missing or malformed. */
export function parseSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const value = (key: string) => rows.find((r) => r.key === key)?.value;
  const ticker = homeTickerSchema.safeParse(value(siteSettingKeys.homeTicker));
  const popup = welcomePopupSchema.safeParse(value(siteSettingKeys.welcomePopup));
  const tracking = trackingSchema.safeParse(value(siteSettingKeys.tracking));
  return {
    homeTicker: ticker.success ? ticker.data : defaultHomeTicker,
    welcomePopup: popup.success ? popup.data : defaultWelcomePopup,
    tracking: tracking.success ? tracking.data : { first_party: true },
  };
}
