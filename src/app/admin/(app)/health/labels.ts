// Plain-English names for what the website records, for the Health page.

export type Bucket = "attention" | "friction" | "handled";

export const bucketLabels: Record<Bucket, { title: string; note: string }> = {
  attention: {
    title: "Needs attention",
    note: "A visitor hit something broken: a page error, or an order that didn’t go through.",
  },
  friction: {
    title: "Got in the way",
    note: "Not a fault, but worth a look: refused codes, missing pages, ordering while closed.",
  },
  handled: {
    title: "Nothing to do",
    note: "Robots, staff testing, and other companies’ scripts (Meta, Google). Kept as a record.",
  },
};

export const handledLabels: Record<string, string> = {
  robot: "Robot",
  staff: "Staff browsing",
  other_script: "Meta’s or Google’s script",
};

const eventLabels: Record<string, string> = {
  page_view: "Opened a page",
  view_item: "Opened an item",
  customize_item: "Changed a choice",
  add_to_cart: "Added to order",
  remove_from_cart: "Removed from order",
  view_cart: "Looked at their order",
  begin_checkout: "Went to checkout",
  add_promo_code: "Used a code",
  promo_rejected: "Code refused",
  place_order_failed: "Order didn’t go through",
  purchase: "Ordered",
  order_placed: "Order saved",
  contact_click: "Tapped WhatsApp or call",
  directions_click: "Opened directions",
  instagram_click: "Went to Instagram",
  facebook_click: "Went to Facebook",
  tiktok_click: "Went to TikTok",
  language_switch: "Switched language",
  popup_viewed: "Saw the welcome popup",
  popup_cta: "Tapped the popup’s button",
  popup_code_copied: "Copied the popup’s code",
  popup_dismissed: "Closed the popup",
  client_error: "Page error",
  not_found: "Page not found",
};

export const eventLabel = (name: string) => eventLabels[name] ?? name;

const orderFailures: Record<string, string> = {
  failed: "Order didn’t save (a fault on our side)",
  unavailable: "Orders are switched off on the server (setup)",
  network: "Order didn’t reach us (connection dropped or the server didn’t answer)",
  closed: "Tried to order while the shop was closed or paused",
  invalid: "Checkout details had mistakes",
  items: "Something in their order wasn’t available",
  promo: "Code refused at checkout",
};

const promoRefusals: Record<string, string> = {
  invalid: "Code doesn’t exist",
  expired: "Code has expired",
  minimum: "Order below the code’s minimum",
  firstOrder: "Code is for first orders only",
  usedUp: "Code used up",
};

/** One line saying what a problem was. */
export function problemTitle(event: string, detail: string) {
  switch (event) {
    case "client_error":
      return `Page error: ${detail || "no message"}`;
    case "not_found":
      return `Page not found: ${detail || "unknown address"}`;
    case "place_order_failed":
      return orderFailures[detail] ?? `Order didn’t go through (${detail || "no reason given"})`;
    case "promo_rejected":
      return `Code refused: ${promoRefusals[detail] ?? (detail || "no reason given")}`;
    default:
      return eventLabel(event);
  }
}
