// All money is integer US cents, so sums never drift (650 = $6.50).
import type { Locale } from "@/i18n/config";

// Arabic pages write the dollar sign after the amount ("6.50$", as in the
// design handoff). The amount is wrapped in a left-to-right isolate so the
// sign stays put whatever Arabic text surrounds it.
const LRI = "\u2066";
const PDI = "\u2069";

const write = (amount: string, lang: Locale, sign = "") =>
  lang === "ar" ? `${LRI}${sign}${amount}$${PDI}` : `${sign}$${amount}`;

/** "$6.50" / "6.50$". Negative amounts (discounts) read "−$7.50". */
export const formatPrice = (cents: number, lang: Locale = "en") =>
  write((Math.abs(cents) / 100).toFixed(2), lang, cents < 0 ? "−" : "");

/** Short form for whole-dollar prices ($18 rather than $18.00). */
export const formatPriceShort = (cents: number, lang: Locale = "en") =>
  cents % 100 === 0 ? write(String(cents / 100), lang) : formatPrice(cents, lang);

/** Price add-on label for an option: "+$0.50", or "" when it's free. */
export const formatAddOn = (cents: number, lang: Locale = "en") =>
  cents > 0 ? write((cents / 100).toFixed(2), lang, "+") : "";
