export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const localeDir = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

/** Inline arrow glyph that points "forward" in the reading direction. */
export const forwardArrow = (locale: Locale) => (locale === "ar" ? "←" : "→");
