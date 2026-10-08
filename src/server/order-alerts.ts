import "server-only";
import { site } from "@/data/site";
import { formatPrice } from "@/lib/money";
import { serviceClient } from "@/lib/supabase/service";
import { sendTemplate, whatsappConfig } from "./whatsapp";

// New-order WhatsApp alerts. create_order queues one notification per number
// in the order_alerts setting; this sends them right after the order is
// placed, and again when retried from the admin. Without the WhatsApp
// settings they stay queued, ready to go once it's connected.
//
// The template (WhatsApp Manager → Message templates, category Utility,
// named by WHATSAPP_ALERT_TEMPLATE, default "new_order_alert"):
//   New order {{1}} from {{2}}: {{3}}. {{4}}, total {{5}}. Open the board: {{6}}

const MAX_ATTEMPTS = 5;

/** "2× Nutella Crêpe, 1× Oreo Milkshake" */
const itemsSummary = (items: { name_en: string; quantity: number }[]) =>
  items.map((i) => `${i.quantity}× ${i.name_en}`).join(", ");

/**
 * Sends the queued (or failed) alerts for one order, or for every order
 * when `orderId` is left out. Returns how many went out and failed.
 */
export async function sendOrderAlerts(orderId?: string) {
  const db = serviceClient();
  const config = whatsappConfig();
  if (!db || !config) return { sent: 0, failed: 0, configured: false };

  let query = db
    .from("notifications")
    .select(
      "id, recipient, attempts, orders(number, customer_name, fulfilment, delivery_zone_name_en, total_cents, order_items(name_en, quantity, position))",
    )
    .eq("kind", "new_order_alert")
    .in("status", ["queued", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(20);
  if (orderId) query = query.eq("order_id", orderId);
  const { data: pending } = await query;

  let sent = 0;
  let failed = 0;
  for (const alert of pending ?? []) {
    const order = alert.orders;
    if (!order) continue;
    // Claim it, so a parallel retry doesn't send it twice.
    const { data: claimed } = await db
      .from("notifications")
      .update({ status: "sending", attempts: alert.attempts + 1 })
      .eq("id", alert.id)
      .in("status", ["queued", "failed"])
      .select("id");
    if (!claimed?.length) continue;

    const items = [...order.order_items].sort((a, b) => a.position - b.position);
    const result = await sendTemplate(config, {
      to: alert.recipient,
      template: process.env.WHATSAPP_ALERT_TEMPLATE || "new_order_alert",
      language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en",
      params: [
        `TSS-${order.number}`,
        order.customer_name,
        itemsSummary(items),
        order.fulfilment === "delivery" ? `Delivery to ${order.delivery_zone_name_en}` : "Pickup",
        formatPrice(order.total_cents ?? 0, "en"),
        `${site.adminUrl}/admin/orders`,
      ],
    });
    await db
      .from("notifications")
      .update(
        result.ok
          ? {
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: result.messageId,
              last_error: null,
            }
          : { status: "failed", last_error: result.error.slice(0, 500) },
      )
      .eq("id", alert.id);
    if (result.ok) sent++;
    else failed++;
  }
  return { sent, failed, configured: true };
}
