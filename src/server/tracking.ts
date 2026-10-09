import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { site } from "@/data/site";
import { metaName, purchaseEventId, type TrackedEvent } from "@/lib/tracking/events";
import type { Database } from "@/lib/supabase/database.types";
import { serviceClient } from "@/lib/supabase/service";
import { metaCapiConfigured, type MetaServerEvent, sendMetaEvents } from "./meta-capi";

// Server-side tracking: the order itself (which no ad blocker can stop), and
// the sweep that sends Meta whatever couldn't go at the time.
//
// orders.meta_relayed_at is set once an order is dealt with for Meta: its
// Purchase sent, or deliberately not (a staff test order).

type Db = SupabaseClient<Database>;

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
  lang: "en" | "ar";
  fulfilment: "pickup" | "delivery";
  /** Cents. */
  total: number;
  /** Cents: food after any discount, without delivery. */
  foodValue: number;
  items: number;
};

/** Meta accepts events up to 7 days old. */
const META_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
      params: { food_value: order.foodValue, fulfilment: order.fulfilment, items: order.items },
    });
  }

  if (request.internal) await markOrders(db, [order.id]);
  else if (metaCapiConfigured()) await relayOrders(db, [order.id]);
}

const markOrders = (db: Db, ids: string[]) =>
  db.from("orders").update({ meta_relayed_at: new Date().toISOString() }).in("id", ids);

/**
 * Sends orders' Purchases to Meta, from what the order saved (the browser's
 * ids, IP address and user agent, the customer's phone and name).
 */
async function relayOrders(db: Db, ids: string[]) {
  const { data: orders } = await db
    .from("orders")
    .select(
      "id, public_token, locale, placed_at, customer_id, customer_name, customer_phone, visitor_id, fbp, fbc, client_ip, client_user_agent, subtotal_cents, discount_cents, order_items(product_slug, quantity, unit_price_cents)",
    )
    .in("id", ids);
  if (!orders?.length) return 0;

  const events: MetaServerEvent[] = orders.map((o) => ({
    eventName: "Purchase",
    eventId: purchaseEventId(o.public_token),
    eventTime: new Date(o.placed_at),
    eventSourceUrl: `${site.url}/${o.locale}/checkout`,
    customer: {
      phone: o.customer_phone,
      name: o.customer_name,
      externalIds: [o.visitor_id, o.customer_id],
    },
    browser: { fbp: o.fbp, fbc: o.fbc, ip: o.client_ip, userAgent: o.client_user_agent },
    customData: {
      value: (o.subtotal_cents - o.discount_cents) / 100,
      currency: "USD",
      order_id: o.public_token,
      content_type: "product",
      content_ids: o.order_items.map((i) => i.product_slug),
      contents: o.order_items.map((i) => ({
        id: i.product_slug,
        quantity: i.quantity,
        item_price: i.unit_price_cents / 100,
      })),
      num_items: o.order_items.reduce((n, i) => n + i.quantity, 0),
    },
  }));
  if (!(await sendMetaEvents(events))) return 0;
  await markOrders(
    db,
    orders.map((o) => o.id),
  );
  return orders.length;
}

/**
 * Sends Meta what it hasn't had yet: orders from the last 7 days whose
 * Purchase didn't go (Meta was down, or the Conversions API wasn't set up),
 * and recorded events whose relay failed. Older ones are closed unsent:
 * Meta refuses them. Run by the sweep job every 10 minutes.
 */
export async function relayPendingToMeta() {
  const db = serviceClient();
  if (!db || !metaCapiConfigured()) return { skipped: true };
  const cutoff = new Date(Date.now() - META_WINDOW_MS).toISOString();

  const { data: orders } = await db
    .from("orders")
    .select("id")
    .is("meta_relayed_at", null)
    .neq("status", "cancelled")
    .gte("placed_at", cutoff)
    .order("placed_at")
    .limit(50);
  const ordersSent = orders?.length
    ? await relayOrders(
        db,
        orders.map((o) => o.id),
      )
    : 0;

  // Events: closed if too old, otherwise sent in one batch.
  await db
    .from("analytics_events")
    .update({ meta_relayed_at: new Date().toISOString() })
    .not("meta_event_id", "is", null)
    .is("meta_relayed_at", null)
    .lt("occurred_at", cutoff);
  const { data: events } = await db
    .from("analytics_events")
    .select(
      "id, event_name, occurred_at, meta_event_id, path, visitor_id, fbp, fbc, client_ip, user_agent, item_id, value_cents, params",
    )
    .not("meta_event_id", "is", null)
    .is("meta_relayed_at", null)
    .eq("bot", false)
    .eq("internal", false)
    .neq("event_name", "purchase")
    .order("occurred_at")
    .limit(500);

  let eventsSent = 0;
  const relayable = (events ?? []).filter((e) => metaName(e.event_name as TrackedEvent));
  if (relayable.length > 0) {
    const sent = await sendMetaEvents(
      relayable.map((e) => {
        const params = (e.params ?? {}) as { food_value?: number };
        const value = params.food_value ?? e.value_cents;
        return {
          eventName: metaName(e.event_name as TrackedEvent)!,
          eventId: e.meta_event_id!,
          eventTime: new Date(e.occurred_at),
          eventSourceUrl: `${site.url}${e.path ?? ""}`,
          customer: { externalIds: [e.visitor_id] },
          browser: { fbp: e.fbp, fbc: e.fbc, ip: e.client_ip, userAgent: e.user_agent },
          customData: {
            ...(value != null ? { value: value / 100, currency: "USD" } : {}),
            ...(e.item_id ? { content_ids: [e.item_id], content_type: "product" } : {}),
          },
        } satisfies MetaServerEvent;
      }),
    );
    if (sent) {
      eventsSent = relayable.length;
      const ids = relayable.map((e) => e.id);
      for (let i = 0; i < ids.length; i += 150)
        await db
          .from("analytics_events")
          .update({ meta_relayed_at: new Date().toISOString() })
          .in("id", ids.slice(i, i + 150));
    }
  }
  return { orders: ordersSent, events: eventsSent };
}
