// One place for ordering events (GA4 e-commerce names), so the tracking setup
// can plug in later without touching the components. Logs in development only.
type OrderEvent =
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout"
  | "add_promo_code"
  | "purchase"
  | "popup_viewed"
  | "popup_cta"
  | "popup_code_copied"
  | "popup_dismissed";

export function track(event: OrderEvent, params: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params);
}
