import "server-only";
import type { CheckPromoResult } from "@/lib/checkout";
import type { PromoRule } from "@/lib/pricing";

// Promo codes stay on the server so the list isn't readable in the browser.
// They move to Supabase (discount codes, redemptions) with the admin side.
type Promotion = PromoRule & {
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  /** Enforced once orders are stored: the phone number must have no earlier order. */
  firstOrderOnly?: boolean;
};

const promotions: Promotion[] = [
  { code: "SWEET20", kind: "percent", value: 20, active: true, firstOrderOnly: true },
];

/** Looks a code up (any case) and checks it against the subtotal in cents. */
export function checkPromo(code: string, subtotal: number, now = new Date()): CheckPromoResult {
  const promo = promotions.find((p) => p.code === code.trim().toUpperCase());
  if (!promo || !promo.active) return { ok: false, error: "invalid" };
  if (promo.startsAt && now < new Date(promo.startsAt)) return { ok: false, error: "invalid" };
  if (promo.endsAt && now > new Date(promo.endsAt)) return { ok: false, error: "expired" };
  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return { ok: false, error: "minimum", shortBy: promo.minSubtotal - subtotal };
  }
  const { code: c, kind, value, minSubtotal, maxDiscount } = promo;
  return { ok: true, rule: { code: c, kind, value, minSubtotal, maxDiscount } };
}
