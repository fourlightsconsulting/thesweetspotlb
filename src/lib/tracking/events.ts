// Every event the website records, and what each one is called on the ad
// platforms. An event missing here is refused by /api/e and sent nowhere,
// so a new call site starts here.
//
// Money: `value` is always cents. Meta and Google Ads get the food only
// (subtotal after discount, no delivery fee), so return on ad spend compares
// like for like across them; GA4 gets the whole total, with the fee as
// shipping, as its e-commerce reports expect.

type Destinations = {
  /** Meta standard event, sent by the pixel and the Conversions API. */
  meta?: string;
  /** GA4 event name. */
  ga4?: string;
  /** Recorded by the server only (never accepted from a browser). */
  server?: true;
};

export const trackedEvents = {
  page_view: { meta: "PageView", ga4: "page_view" },
  view_item: { meta: "ViewContent", ga4: "view_item" },
  customize_item: { meta: "CustomizeProduct" },
  add_to_cart: { meta: "AddToCart", ga4: "add_to_cart" },
  remove_from_cart: { ga4: "remove_from_cart" },
  view_cart: { ga4: "view_cart" },
  begin_checkout: { meta: "InitiateCheckout", ga4: "begin_checkout" },
  add_promo_code: {},
  promo_rejected: {},
  place_order_failed: {},
  purchase: { meta: "Purchase", ga4: "purchase" },
  contact_click: { meta: "Contact", ga4: "contact" },
  directions_click: { meta: "FindLocation", ga4: "get_directions" },
  toters_click: { ga4: "toters_click" },
  instagram_click: {},
  language_switch: {},
  popup_viewed: {},
  popup_cta: {},
  popup_code_copied: {},
  popup_dismissed: {},
  client_error: {},
  not_found: {},
  order_placed: { server: true },
} as const satisfies Record<string, Destinations>;

export type TrackedEvent = keyof typeof trackedEvents;
/** The events a browser may send. */
export type BrowserEvent = {
  [K in TrackedEvent]: (typeof trackedEvents)[K] extends { server: true } ? never : K;
}[TrackedEvent];

export const isBrowserEvent = (name: string): name is BrowserEvent =>
  Object.hasOwn(trackedEvents, name) && !("server" in trackedEvents[name as TrackedEvent]);

export const metaName = (name: TrackedEvent): string | undefined =>
  (trackedEvents[name] as Destinations).meta;

export const ga4Name = (name: TrackedEvent): string | undefined =>
  (trackedEvents[name] as Destinations).ga4;

/**
 * The Meta event id for a purchase, the same in the browser (pixel) and on
 * the server (Conversions API), so Meta counts the order once.
 */
export const purchaseEventId = (orderRef: string) => `purchase:${orderRef}`;
