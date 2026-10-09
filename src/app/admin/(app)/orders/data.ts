// What the order screens read, and the order's steps. Shared by the server
// (first load) and the browser (live updates through the staff session).
import type { QueryData, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const orderSelect =
  "id, number, is_test, status, fulfilment, payment_method, payment_status, customer_id, customer_name, customer_phone, delivery_zone_name_en, address_street, address_floor, delivery_note, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, quoted_total_cents, discount_code, eta_min_minutes, eta_max_minutes, cancel_reason, placed_at, preparing_at, ready_at, completed_at, cancelled_at, order_items(id, position, product_slug, name_en, quantity, unit_price_cents, line_total_cents, note, order_item_options(id, group_key, group_name_en, option_name_en, price_cents))";

export const orderQuery = (db: SupabaseClient<Database>) => db.from("orders").select(orderSelect);

export type Order = QueryData<ReturnType<typeof orderQuery>>[number];
export type OrderLine = Order["order_items"][number];
export type OrderStatus = Database["public"]["Enums"]["order_status"];

/** The board: everything placed since `since` (today), newest first. */
export const boardQuery = (db: SupabaseClient<Database>, since: string) =>
  orderQuery(db)
    .gte("placed_at", since)
    .order("placed_at", { ascending: false })
    .order("position", { referencedTable: "order_items" });

// Orders are completed once placed for now (see the orders_complete_when_placed
// migration); the other steps return when the shop tracks orders.
export const statusLabel = (order: Pick<Order, "status" | "fulfilment">) => {
  switch (order.status) {
    case "received":
      return "New";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready for pickup";
    case "out_for_delivery":
      return "Out for delivery";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
};

/**
 * A line's choices as one short string. Bundle lines group each pick with
 * its own choices: "Nutella Crêpe (Strawberries) · Lotus Milkshake".
 */
export function describeOptions(options: OrderLine["order_item_options"]) {
  const isBundle = options.some((o) => o.group_key.includes("/"));
  if (!isBundle) return options.map((o) => o.option_name_en).join(" · ");
  return options
    .filter((o) => !o.group_key.includes("/"))
    .map((pick) => {
      const own = options
        .filter((o) => o.group_key.startsWith(`${pick.group_key}/`))
        .map((o) => o.option_name_en);
      return own.length > 0 ? `${pick.option_name_en} (${own.join(", ")})` : pick.option_name_en;
    })
    .join(" · ");
}

/** When the order is due: placed + the longest ETA it was promised. */
export const dueAt = (order: Pick<Order, "placed_at" | "eta_max_minutes">) =>
  new Date(new Date(order.placed_at).getTime() + order.eta_max_minutes * 60_000);

/** The reasons offered when cancelling; staff can write their own. */
export const cancelReasons = [
  "Customer asked to cancel",
  "Couldn’t reach the customer",
  "Something on the order isn’t available",
  "Too busy to take it",
  "Duplicate order",
];
