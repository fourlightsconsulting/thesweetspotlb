import "server-only";
import { after } from "next/server";
import { z } from "zod";
import type { Menu, MenuItem } from "@/data/menu";
import { ordering } from "@/data/ordering";
import { locales } from "@/i18n/config";
import {
  type CheckPromoResult,
  type PlaceOrderInput,
  type PlaceOrderResult,
  validateFields,
} from "@/lib/checkout";
import { storeStatus } from "@/lib/hours";
import { normalisePhone } from "@/lib/phone";
import {
  chosenOptions,
  describeSelections,
  orderTotals,
  priceLines,
  type Selections,
} from "@/lib/pricing";
import { serviceClient } from "@/lib/supabase/service";
import { getMenu, getOrderingBranch, ORDERING_BRANCH } from "./catalog";
import { sendOrderAlerts } from "./order-alerts";
import { checkPromo } from "./promotions";

// The request is untrusted: only ids, quantities, choices and contact details
// come from the browser. Prices, fees and discounts are worked out here from
// the live menu. If they differ from what the customer saw (prices changed
// mid-checkout), the order still goes through: staff check every order
// before starting it, and the total the customer saw is saved with it.
const text = (max: number) => z.string().max(max);
const inputSchema = z.object({
  idempotencyKey: z.uuid(),
  lang: z.enum(locales),
  mode: z.enum(["pickup", "delivery"]),
  fields: z.object({
    name: text(60),
    phone: text(24),
    zone: text(40),
    street: text(160),
    floor: text(80),
    driverNote: text(ordering.noteMaxLength),
  }),
  promoCode: text(24).nullable(),
  lines: z
    .array(
      z.object({
        itemId: text(64),
        qty: z.int().min(1).max(ordering.maxQuantity),
        selections: z.record(text(80), z.array(text(64)).max(30)),
        note: text(ordering.noteMaxLength),
      }),
    )
    .min(1)
    .max(ordering.maxLines),
  quotedTotal: z.int().min(0),
});

export function quotePromo(code: string, subtotal: number): Promise<CheckPromoResult> {
  return checkPromo(code, subtotal);
}

/**
 * The order's choices as create_order stores them: names and prices as the
 * customer saw them. A bundle's picks come first, each followed by its own
 * choices under "slot/group".
 */
function optionSnapshot(menu: Menu, item: MenuItem, selections: Selections) {
  return chosenOptions(item, menu, selections).map((o) => ({
    group: o.key,
    group_name_en: o.groupName.en,
    group_name_ar: o.groupName.ar,
    option: o.id,
    name_en: o.name.en,
    name_ar: o.name.ar,
    price_cents: o.price,
  }));
}

export async function placeOrder(raw: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", fields: {} };
  const input = parsed.data;

  const [menu, branch] = await Promise.all([getMenu(), getOrderingBranch()]);

  const fieldErrors = validateFields(input.mode, input.fields);
  const zone = branch.zones.find((z) => z.id === input.fields.zone);
  if (input.mode === "delivery" && input.fields.zone && !zone) fieldErrors.zone = "area";
  if (Object.keys(fieldErrors).length > 0)
    return { ok: false, code: "invalid", fields: fieldErrors };

  const now = new Date();
  const status = storeStatus(branch.schedule, now);
  if (!status.open) return { ok: false, code: "closed", reopens: status.reopens };

  const { priced, invalid, subtotal } = priceLines(input.lines, menu);
  if (invalid.length > 0) return { ok: false, code: "items" };

  const phone = normalisePhone(input.fields.phone) ?? input.fields.phone;
  let promo = null;
  if (input.promoCode) {
    const result = await checkPromo(input.promoCode, subtotal, phone);
    if (!result.ok) return { ok: false, code: "promo", error: result.error };
    promo = result.rule;
  }

  const delivery = input.mode === "delivery" && zone ? zone : null;
  const totals = orderTotals(subtotal, delivery?.fee ?? 0, promo);
  const name = input.fields.name.trim();
  const address = delivery
    ? { zone: delivery.name, street: input.fields.street.trim(), floor: input.fields.floor.trim() }
    : null;
  const lines = priced.map(({ line, item, total }) => ({
    name: item.name,
    options: {
      en: describeSelections(item, menu, line.selections, "en"),
      ar: describeSelections(item, menu, line.selections, "ar"),
    },
    note: line.note.trim(),
    qty: line.qty,
    total,
  }));
  const eta = branch.eta[input.mode];

  const db = serviceClient();
  if (!db) {
    // Development without Supabase: a demo order that goes nowhere.
    if (process.env.NODE_ENV === "production") return { ok: false, code: "unavailable" };
    return {
      ok: true,
      order: {
        ref: crypto.randomUUID(),
        number: `TSS-${1000 + Math.floor(Math.random() * 9000)}`,
        placedAt: now.toISOString(),
        mode: input.mode,
        name,
        phone,
        address,
        lines,
        totals,
        promoCode: promo?.code ?? null,
        eta,
        demo: true,
      },
    };
  }

  const { data, error } = await db
    .rpc("create_order", {
      payload: {
        idempotency_key: input.idempotencyKey,
        branch: ORDERING_BRANCH,
        locale: input.lang,
        fulfilment: input.mode,
        name,
        phone,
        ...(delivery
          ? {
              zone: { slug: delivery.id, name_en: delivery.name.en, name_ar: delivery.name.ar },
              street: address!.street,
              floor: address!.floor,
              delivery_note: input.fields.driverNote.trim(),
            }
          : {}),
        ...(promo ? { discount_code: promo.code } : {}),
        discount_cents: totals.discount,
        delivery_fee_cents: totals.deliveryFee,
        quoted_total_cents: input.quotedTotal,
        lines: priced.map(({ line, item }) => ({
          product: item.id,
          name_en: item.name.en,
          name_ar: item.name.ar,
          base_price_cents: item.price,
          quantity: line.qty,
          note: line.note.trim(),
          options: optionSnapshot(menu, item, line.selections),
        })),
      },
    })
    .single<{
      order_id: string;
      order_number: number;
      public_token: string;
      total_cents: number;
      already_placed: boolean;
    }>();
  if (error || !data) {
    console.error("create_order failed", error);
    return { ok: false, code: "failed" };
  }
  // The shop's WhatsApp alerts go out once the customer has their answer.
  if (!data.already_placed) after(() => sendOrderAlerts(data.order_id));

  return {
    ok: true,
    order: {
      ref: data.public_token,
      number: `TSS-${data.order_number}`,
      placedAt: now.toISOString(),
      mode: input.mode,
      name,
      phone,
      address,
      lines,
      totals,
      promoCode: promo?.code ?? null,
      eta,
      demo: false,
    },
  };
}
