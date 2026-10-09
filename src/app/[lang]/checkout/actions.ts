"use server";

import { cookies, headers } from "next/headers";
import type { CheckPromoResult, PlaceOrderInput, PlaceOrderResult } from "@/lib/checkout";
import { placeOrder, quotePromo } from "@/server/orders";
import { STAFF_COOKIE } from "@/lib/staff-cookie";

// Thin entry points: all checks live in src/server/orders.ts.

export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  return placeOrder(input, {
    ip: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
    internal: jar.has(STAFF_COOKIE),
  });
}

export async function checkPromoAction(code: string, subtotal: number): Promise<CheckPromoResult> {
  if (typeof code !== "string" || !Number.isInteger(subtotal) || subtotal < 0) {
    return { ok: false, error: "invalid" };
  }
  return quotePromo(code.slice(0, 24), subtotal);
}
