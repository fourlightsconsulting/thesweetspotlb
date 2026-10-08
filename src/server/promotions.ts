import "server-only";
import type { CheckPromoResult, PromoError } from "@/lib/checkout";
import type { PromoRule } from "@/lib/pricing";
import { serviceClient } from "@/lib/supabase/service";

// Discount codes live in Supabase (discount_codes, edited in the admin) and
// are checked by check_discount_code, with the secret key so the list isn't
// readable in the browser. Without Supabase (development, tests) the one
// launch code below stands in.

const builtInCodes: (PromoRule & { firstOrderOnly?: boolean })[] = [
  { code: "SWEET20", kind: "percent", value: 20, firstOrderOnly: true },
];

const errors: Record<string, PromoError> = {
  invalid: "invalid",
  expired: "expired",
  minimum: "minimum",
  first_order: "firstOrder",
  used_up: "usedUp",
};

/**
 * Looks a code up (any case) and checks it against the subtotal in cents.
 * With the customer's phone it also checks first-order and per-customer limits.
 */
export async function checkPromo(
  code: string,
  subtotal: number,
  phone: string | null = null,
): Promise<CheckPromoResult> {
  const db = serviceClient();
  if (!db) {
    const promo = builtInCodes.find((p) => p.code === code.trim().toUpperCase());
    if (!promo) return { ok: false, error: "invalid" };
    const { code: c, kind, value, minSubtotal, maxDiscount } = promo;
    return { ok: true, rule: { code: c, kind, value, minSubtotal, maxDiscount } };
  }

  const { data, error } = await db.rpc("check_discount_code", {
    p_code: code,
    p_subtotal_cents: subtotal,
    p_phone: phone ?? undefined,
  });
  if (error) throw new Error(`check_discount_code failed: ${error.message}`);

  const result = data as {
    ok: boolean;
    error?: string;
    short_by_cents?: number;
    code?: string;
    kind?: PromoRule["kind"];
    value?: number;
    min_subtotal_cents?: number;
    max_discount_cents?: number | null;
  };
  if (!result.ok) {
    return {
      ok: false,
      error: errors[result.error ?? ""] ?? "invalid",
      ...(result.short_by_cents ? { shortBy: result.short_by_cents } : {}),
    };
  }
  return {
    ok: true,
    rule: {
      code: result.code!,
      kind: result.kind!,
      value: result.value!,
      ...(result.min_subtotal_cents ? { minSubtotal: result.min_subtotal_cents } : {}),
      ...(result.max_discount_cents ? { maxDiscount: result.max_discount_cents } : {}),
    },
  };
}
