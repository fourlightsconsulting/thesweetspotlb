// Shapes shared by the checkout form, the server action and the thanks page.
import type { Localized } from "@/data/menu";
import type { Fulfilment } from "@/data/ordering";
import type { Locale } from "@/i18n/config";
import { normalisePhone } from "@/lib/phone";
import type { PromoRule, Selections, Totals } from "@/lib/pricing";

export type CheckoutFields = {
  name: string;
  phone: string;
  zone: string;
  street: string;
  floor: string;
  driverNote: string;
};

export type FieldError = "name" | "phone" | "phoneInvalid" | "area" | "street";

export type PlaceOrderInput = {
  /** One per checkout attempt, so a retried submit can't create a second order. */
  idempotencyKey: string;
  lang: Locale;
  mode: Fulfilment;
  fields: CheckoutFields;
  promoCode: string | null;
  lines: { itemId: string; qty: number; selections: Selections; note: string }[];
  /**
   * The total the customer saw. Saved with the order so staff can spot a
   * difference (prices changed mid-checkout); it never blocks the order.
   */
  quotedTotal: number;
  /** This browser's visitor and visit, and Meta's cookies: joins the order to its visits. */
  tracking?: {
    visitorId: string | null;
    visitId: string | null;
    fbp: string | null;
    fbc: string | null;
  } | null;
};

/** What the customer sends the shop on WhatsApp, and the thanks card shows. */
export type PlacedOrder = {
  ref: string;
  number: string;
  mode: Fulfilment;
  name: string;
  phone: string;
  address: { zone: Localized; street: string; floor: string; note: string } | null;
  /** Each line's choices, one per entry. */
  lines: { name: Localized; options: Record<Locale, string[]>; note: string; qty: number }[];
  totals: Totals;
  promoCode: string | null;
  /** True while orders aren't connected to the shop yet (development). */
  demo: boolean;
};

export type PromoError = "invalid" | "expired" | "minimum" | "firstOrder" | "usedUp";

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; code: "invalid"; fields: Partial<Record<keyof CheckoutFields, FieldError>> }
  /** `reopens` as in StoreStatus: null while ordering is paused. */
  | { ok: false; code: "closed"; reopens: { inDays: number; at: number } | null }
  | { ok: false; code: "items" }
  | { ok: false; code: "promo"; error: PromoError }
  | { ok: false; code: "unavailable" }
  /** The order couldn't be saved (a network or database error); retrying is safe. */
  | { ok: false; code: "failed" };

export type CheckPromoResult =
  { ok: true; rule: PromoRule } | { ok: false; error: PromoError; shortBy?: number };

/** The same field rules on both sides: instant feedback in the form, enforced on the server. */
export function validateFields(mode: Fulfilment, fields: CheckoutFields) {
  const errors: Partial<Record<keyof CheckoutFields, FieldError>> = {};
  if (fields.name.trim().length < 2) errors.name = "name";
  if (!fields.phone.trim()) errors.phone = "phone";
  else if (!normalisePhone(fields.phone)) errors.phone = "phoneInvalid";
  if (mode === "delivery") {
    if (!fields.zone) errors.zone = "area";
    if (fields.street.trim().length < 3) errors.street = "street";
  }
  return errors;
}
