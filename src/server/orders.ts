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
  type PlacedOrder,
  validateFields,
} from "@/lib/checkout";
import { storeStatus } from "@/lib/hours";
import { normalisePhone } from "@/lib/phone";
import {
  chosenOptions,
  orderTotals,
  priceLines,
  type Selections,
  selectionParts,
} from "@/lib/pricing";
import { serviceClient } from "@/lib/supabase/service";
import { getMenu, getOrderingBranch, ORDERING_BRANCH } from "./catalog";
import { sendOrderAlerts } from "./order-alerts";
import { reportOrderPlaced, type RequestInfo } from "./tracking";
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
    area: text(64),
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
  tracking: z
    .object({
      visitorId: text(64).nullable(),
      visitId: text(64).nullable(),
      fbp: text(120).nullable(),
      fbc: text(500).nullable(),
    })
    .nullish(),
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

/** Who's ordering, from the request (the server action reads it). */
const noRequest: RequestInfo = { ip: null, userAgent: null, internal: false };

type OrderDb = NonNullable<ReturnType<typeof serviceClient>>;

/** Recover from stored snapshots, even if the menu or promo has since changed. */
async function findPlacedOrder(db: OrderDb, idempotencyKey: string): Promise<PlacedOrder | null> {
  const { data, error } = await db
    .from("orders")
    .select(
      "public_token, number, fulfilment, customer_name, customer_phone, delivery_area_name_en, delivery_area_name_ar, address_street, address_floor, delivery_note, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, discount_code, order_items(position, name_en, name_ar, quantity, note, order_item_options(group_key, option_name_en, option_name_ar))",
    )
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(`Recovering the order failed: ${error.message}`);
  if (!data) return null;

  return {
    ref: data.public_token,
    number: `TSS-${data.number}`,
    mode: data.fulfilment,
    name: data.customer_name,
    phone: data.customer_phone,
    address:
      data.fulfilment === "delivery"
        ? {
            area: { en: data.delivery_area_name_en ?? "", ar: data.delivery_area_name_ar ?? "" },
            street: data.address_street ?? "",
            floor: data.address_floor ?? "",
            note: data.delivery_note ?? "",
          }
        : null,
    lines: data.order_items
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        const parts = (lang: "en" | "ar") =>
          item.order_item_options
            .filter((option) => !option.group_key.includes("/"))
            .map((option) => {
              const own = item.order_item_options
                .filter((child) => child.group_key.startsWith(`${option.group_key}/`))
                .map((child) => child[`option_name_${lang}`]);
              const name = option[`option_name_${lang}`];
              return own.length > 0 ? `${name} (${own.join(lang === "ar" ? "، " : ", ")})` : name;
            });
        return {
          name: { en: item.name_en, ar: item.name_ar },
          options: { en: parts("en"), ar: parts("ar") },
          note: item.note,
          qty: item.quantity,
        };
      }),
    totals: {
      subtotal: data.subtotal_cents,
      discount: data.discount_cents,
      deliveryFee: data.delivery_fee_cents,
      total:
        data.total_cents ?? data.subtotal_cents - data.discount_cents + data.delivery_fee_cents,
    },
    promoCode: data.discount_code,
    demo: false,
  };
}

export async function placeOrder(
  raw: PlaceOrderInput,
  request: RequestInfo = noRequest,
): Promise<PlaceOrderResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", fields: {} };
  const input = parsed.data;
  const db = serviceClient();

  try {
    // A saved attempt wins over current hours, availability and promo limits.
    const saved = db && (await findPlacedOrder(db, input.idempotencyKey));
    if (saved) return { ok: true, order: saved };

    const result = await placeNewOrder(input, request, db);
    if (db && !result.ok) {
      // Another request may have saved this attempt while we were validating it.
      const saved = await findPlacedOrder(db, input.idempotencyKey);
      if (saved) return { ok: true, order: saved };
    }
    return result;
  } catch (error) {
    console.error("place_order failed", error);
    return { ok: false, code: "failed" };
  }
}

async function placeNewOrder(
  input: PlaceOrderInput,
  request: RequestInfo,
  db: OrderDb | null,
): Promise<PlaceOrderResult> {
  const [menu, branch] = await Promise.all([getMenu(), getOrderingBranch()]);

  const fieldErrors = validateFields(input.mode, input.fields);
  const area = branch.areas.find((z) => z.id === input.fields.area);
  if (input.mode === "delivery" && input.fields.area && !area) fieldErrors.area = "area";
  if (Object.keys(fieldErrors).length > 0)
    return { ok: false, code: "invalid", fields: fieldErrors };

  const status = storeStatus(branch.schedule);
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

  const delivery = input.mode === "delivery" && area ? area : null;
  const totals = orderTotals(subtotal, delivery?.fee ?? 0, promo);
  const name = input.fields.name.trim();
  const address = delivery
    ? {
        area: delivery.name,
        street: input.fields.street.trim(),
        floor: input.fields.floor.trim(),
        note: input.fields.driverNote.trim(),
      }
    : null;
  const lines = priced.map(({ line, item }) => ({
    name: item.name,
    options: {
      en: selectionParts(item, menu, line.selections, "en"),
      ar: selectionParts(item, menu, line.selections, "ar"),
    },
    note: line.note.trim(),
    qty: line.qty,
  }));

  if (!db) {
    // Development without Supabase: a demo order that goes nowhere.
    if (process.env.NODE_ENV === "production") return { ok: false, code: "unavailable" };
    return {
      ok: true,
      order: {
        ref: crypto.randomUUID(),
        number: `TSS-${1000 + Math.floor(Math.random() * 9000)}`,
        mode: input.mode,
        name,
        phone,
        address,
        lines,
        totals,
        promoCode: promo?.code ?? null,
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
              area: { slug: delivery.id, name_en: delivery.name.en, name_ar: delivery.name.ar },
              street: address!.street,
              floor: address!.floor,
              delivery_note: address!.note,
            }
          : {}),
        ...(promo ? { discount_code: promo.code } : {}),
        discount_cents: totals.discount,
        delivery_fee_cents: totals.deliveryFee,
        quoted_total_cents: input.quotedTotal,
        tracking: {
          visitor_id: input.tracking?.visitorId ?? null,
          visit_id: input.tracking?.visitId ?? null,
          fbp: input.tracking?.fbp ?? null,
          fbc: input.tracking?.fbc ?? null,
          ip: request.ip,
          user_agent: request.userAgent,
        },
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
  if (data.already_placed) {
    const saved = await findPlacedOrder(db, input.idempotencyKey);
    return saved ? { ok: true, order: saved } : { ok: false, code: "failed" };
  }
  // The shop's WhatsApp alerts and the order's tracking happen once the
  // customer has their answer.
  after(async () => {
    await sendOrderAlerts(data.order_id);
    await reportOrderPlaced(
      {
        id: data.order_id,
        lang: input.lang,
        fulfilment: input.mode,
        total: data.total_cents,
        foodValue: totals.subtotal - totals.discount,
        items: priced.reduce((n, p) => n + p.line.qty, 0),
      },
      input.tracking ?? null,
      request,
    );
  });

  return {
    ok: true,
    order: {
      ref: data.public_token,
      number: `TSS-${data.order_number}`,
      mode: input.mode,
      name,
      phone,
      address,
      lines,
      totals,
      promoCode: promo?.code ?? null,
      demo: false,
    },
  };
}
