import "server-only";
import { z } from "zod";
import { menu } from "@/data/menu";
import { deliveryZones, ordering } from "@/data/ordering";
import { locales } from "@/i18n/config";
import {
  type CheckPromoResult,
  type PlacedOrder,
  type PlaceOrderInput,
  type PlaceOrderResult,
  validateFields,
} from "@/lib/checkout";
import { storeStatus } from "@/lib/hours";
import { normalisePhone } from "@/lib/phone";
import { describeSelections, orderTotals, priceLines } from "@/lib/pricing";
import { checkPromo } from "./promotions";

// The request is untrusted: only ids, quantities, choices and contact details
// come from the browser. Prices, fees and discounts are worked out here. If
// they differ from what the customer saw (prices changed mid-checkout), the
// order still goes through: staff check every order before starting it.
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
        selections: z.record(text(40), z.array(text(40)).max(30)),
        note: text(ordering.noteMaxLength),
      }),
    )
    .min(1)
    .max(ordering.maxLines),
  quotedTotal: z.int().min(0),
});

/** Whether orders have somewhere to go yet (Supabase for storage, WhatsApp for the alert). */
const backendReady = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

export function quotePromo(code: string, subtotal: number): CheckPromoResult {
  return checkPromo(code, subtotal);
}

export async function placeOrder(raw: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", fields: {} };
  const input = parsed.data;

  const fieldErrors = validateFields(input.mode, input.fields);
  const zone = deliveryZones.find((z) => z.id === input.fields.zone);
  if (input.mode === "delivery" && input.fields.zone && !zone) fieldErrors.zone = "area";
  if (Object.keys(fieldErrors).length > 0)
    return { ok: false, code: "invalid", fields: fieldErrors };

  const now = new Date();
  const status = storeStatus(now, ordering.lastOrderMinutes);
  if (!status.open) {
    return {
      ok: false,
      code: "closed",
      opensAt: status.opensAt,
      opensTomorrow: status.opensTomorrow,
    };
  }

  const { priced, invalid, subtotal } = priceLines(input.lines, menu);
  if (invalid.length > 0) return { ok: false, code: "items" };

  let promo = null;
  if (input.promoCode) {
    const result = checkPromo(input.promoCode, subtotal, now);
    if (!result.ok) return { ok: false, code: "promo", error: result.error };
    promo = result.rule;
  }

  const delivery = input.mode === "delivery" && zone ? zone : null;
  const totals = orderTotals(subtotal, delivery?.fee ?? 0, promo);

  if (!backendReady() && process.env.NODE_ENV === "production") {
    return { ok: false, code: "unavailable" };
  }

  const order: PlacedOrder = {
    ref: crypto.randomUUID(),
    // Placeholder until the database hands out sequential numbers.
    number: `TSS-${1000 + Math.floor(Math.random() * 9000)}`,
    placedAt: now.toISOString(),
    mode: input.mode,
    name: input.fields.name.trim(),
    phone: normalisePhone(input.fields.phone) ?? input.fields.phone,
    address: delivery
      ? {
          zone: delivery.name,
          street: input.fields.street.trim(),
          floor: input.fields.floor.trim(),
        }
      : null,
    lines: priced.map(({ line, item, total }) => ({
      name: item.name,
      options: {
        en: describeSelections(item, menu.groups, line.selections, "en"),
        ar: describeSelections(item, menu.groups, line.selections, "ar"),
      },
      note: line.note.trim(),
      qty: line.qty,
      total,
    })),
    totals,
    promoCode: promo?.code ?? null,
    eta: ordering.eta[input.mode],
    demo: !backendReady(),
  };

  // TODO(supabase): check the code again with check_discount_code (with the
  // phone, for first-order codes), then save the order, quotedTotal included,
  // with create_order (supabase/migrations/), which also queues the WhatsApp alert.
  return { ok: true, order };
}
