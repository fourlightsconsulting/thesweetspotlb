import "server-only";
import { site } from "@/data/site";
import { purchaseEventId } from "@/lib/tracking/events";
import { serviceClient } from "@/lib/supabase/service";
import { metaCapiConfigured, sendMetaEvents } from "./meta-capi";

// Server-side tracking: the order itself, which no ad blocker can stop.

export type OrderTracking = {
  visitorId?: string | null;
  visitId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type RequestInfo = {
  ip: string | null;
  userAgent: string | null;
  /** Staff placing a test order. */
  internal: boolean;
};

type PlacedOrder = {
  id: string;
  ref: string;
  lang: "en" | "ar";
  name: string;
  phone: string;
  fulfilment: "pickup" | "delivery";
  /** Cents. */
  total: number;
  /** Cents: food after any discount, without delivery. */
  foodValue: number;
  items: { id: string; quantity: number; price: number }[];
};

/**
 * After an order is saved: the `order_placed` event, and Meta's Purchase
 * (with the customer's phone and name, hashed), unless it's staff testing.
 * Uses the same event id as the browser's purchase, so Meta counts one.
 */
export async function reportOrderPlaced(
  order: PlacedOrder,
  tracking: OrderTracking | null,
  request: RequestInfo,
) {
  const db = serviceClient();
  if (!db) return;

  const { data: settings } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "tracking")
    .maybeSingle();
  if ((settings?.value as { first_party?: boolean } | null)?.first_party !== false) {
    await db.from("analytics_events").insert({
      event_name: "order_placed",
      visitor_id: tracking?.visitorId?.slice(0, 64),
      visit_id: tracking?.visitId?.slice(0, 64),
      locale: order.lang,
      path: `/${order.lang}/checkout`,
      order_id: order.id,
      value_cents: order.total,
      fbp: tracking?.fbp?.slice(0, 120),
      fbc: tracking?.fbc?.slice(0, 500),
      client_ip: request.ip?.slice(0, 64),
      user_agent: request.userAgent?.slice(0, 500),
      internal: request.internal,
      params: {
        food_value: order.foodValue,
        fulfilment: order.fulfilment,
        items: order.items.reduce((n, i) => n + i.quantity, 0),
      },
    });
  }

  if (request.internal || !metaCapiConfigured()) return;
  const { data: customer } = await db
    .from("orders")
    .select("customer_id")
    .eq("id", order.id)
    .single();
  const sent = await sendMetaEvents([
    {
      eventName: "Purchase",
      eventId: purchaseEventId(order.ref),
      eventSourceUrl: `${site.url}/${order.lang}/checkout`,
      customer: {
        phone: order.phone,
        name: order.name,
        externalIds: [tracking?.visitorId ?? null, customer?.customer_id ?? null],
      },
      browser: {
        fbp: tracking?.fbp,
        fbc: tracking?.fbc,
        ip: request.ip,
        userAgent: request.userAgent,
      },
      customData: {
        value: order.foodValue / 100,
        currency: "USD",
        order_id: order.ref,
        content_type: "product",
        content_ids: order.items.map((i) => i.id),
        contents: order.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          item_price: i.price / 100,
        })),
        num_items: order.items.reduce((n, i) => n + i.quantity, 0),
      },
    },
  ]);
  if (sent)
    await db
      .from("orders")
      .update({ meta_relayed_at: new Date().toISOString() })
      .eq("id", order.id);
}
