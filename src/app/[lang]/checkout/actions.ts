"use server";

import type { CheckPromoResult, PlaceOrderInput, PlaceOrderResult } from "@/lib/checkout";
import { placeOrder, quotePromo } from "@/server/orders";

// Thin entry points: all checks live in src/server/orders.ts.

export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return placeOrder(input);
}

export async function checkPromoAction(code: string, subtotal: number): Promise<CheckPromoResult> {
  if (typeof code !== "string" || !Number.isInteger(subtotal) || subtotal < 0) {
    return { ok: false, error: "invalid" };
  }
  return quotePromo(code.slice(0, 24), subtotal);
}
