// track(): one call per thing a visitor does, sent to three places:
//   1. our own record (POST /api/e), which ad blockers don't touch and which
//      the server relays to Meta's Conversions API;
//   2. the Meta pixel, with the same event id, so Meta counts it once;
//   3. GA4 (and, for purchases, the Google Ads conversion).
// Event names and their platform names live in events.ts.
import { adsOn, debug, metaOn } from "./config";
import { type BrowserEvent, ga4Name, metaName, purchaseEventId } from "./events";
import { adsPurchase, ga4Event, googleInit, googleUserData } from "./google";
import { letters, nameParts, phoneDigits } from "./identity";
import { type MetaMatching, metaInit, metaTrack, seedMetaCookies } from "./meta";
import { cleanParams, cleanUrl } from "./sanitize";
import { campaignTags, currentPath, readCookie, visitorSession } from "./visitor";

export type { BrowserEvent } from "./events";

/** One menu line, for the platforms' e-commerce reports. */
export type TrackItem = { id: string; name: string; price: number; quantity: number };

export type TrackParams = {
  item_id?: string;
  /** Cents: the full amount (GA4). */
  value?: number;
  /** Cents: food only, after any discount and without delivery (Meta, Google Ads). */
  food_value?: number;
  /** Cents. */
  shipping?: number;
  items?: TrackItem[];
  /** The order's reference (its status link), for purchases. */
  order_ref?: string;
  [key: string]: unknown;
};

// ─── The customer, for the platforms' matching ────────────────────────────
// Kept 30 days on this device, then forgotten (a shared phone shouldn't
// carry the last customer's identity forever).

const CUSTOMER_KEY = "tss-customer";
const CUSTOMER_TTL = 30 * 24 * 60 * 60 * 1000;

type Customer = { at: number; phone: string; first: string; last: string };

function storedCustomer(): Customer | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "null") as Customer | null;
    return parsed && Date.now() - parsed.at < CUSTOMER_TTL ? parsed : null;
  } catch {
    return null;
  }
}

/** Remembers who's ordering (from checkout) so later events match them. */
export function rememberCustomer(input: { phone: string; name: string }) {
  const phone = phoneDigits(input.phone);
  const { first, last } = nameParts(input.name);
  if (!phone && !first) return;
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ at: Date.now(), phone, first, last }));
  } catch {}
  applyCustomer();
}

function metaMatching(visitorId: string): MetaMatching {
  const customer = storedCustomer();
  return {
    external_id: visitorId,
    country: "lb",
    ...(customer?.phone ? { ph: customer.phone } : {}),
    ...(customer?.first ? { fn: customer.first } : {}),
    ...(customer?.last ? { ln: letters(customer.last) } : {}),
  };
}

function applyCustomer() {
  const customer = storedCustomer();
  if (!customer) return;
  if (metaOn()) metaInit(metaMatching(visitorSession().visitorId));
  if (adsOn())
    googleUserData({
      ...(customer.phone ? { phone_number: `+${customer.phone}` } : {}),
      address: {
        ...(customer.first ? { first_name: customer.first } : {}),
        ...(customer.last ? { last_name: customer.last } : {}),
        country: "LB",
      },
    });
}

// ─── Sending ──────────────────────────────────────────────────────────────

/** The ids checkout sends with an order, to join it to this visit. */
export function trackingIds() {
  const { visitorId, visitId } = visitorSession();
  return {
    visitorId,
    visitId,
    fbp: readCookie("_fbp") ?? null,
    fbc: readCookie("_fbc") ?? null,
  };
}

function sendFirstParty(name: BrowserEvent, params: TrackParams, metaEventId: string | undefined) {
  const session = visitorSession();
  const { item_id, value, order_ref, food_value, shipping, items, ...extra } = params;
  // The page's title and full address are for GA4; our record has the path.
  const rest = Object.fromEntries(
    Object.entries(extra).filter(([key]) => key !== "page_title" && key !== "page_location"),
  );
  const referrer =
    document.referrer && new URL(document.referrer).host !== location.host
      ? cleanUrl(document.referrer, { stripTracking: false })
      : undefined;
  const body = JSON.stringify({
    e: name,
    v: session.visitorId,
    s: session.visitId,
    p: currentPath(),
    l: session.landingPage,
    r: referrer,
    t: campaignTags(),
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    lang: document.documentElement.lang,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    i: item_id,
    o: order_ref,
    val: value,
    m: metaEventId,
    x: cleanParams({
      ...rest,
      ...(items ? { items: items.length } : {}),
      ...(food_value !== undefined ? { food_value } : {}),
      ...(shipping !== undefined ? { shipping } : {}),
    }),
  });
  try {
    const sent = navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" }));
    if (!sent)
      void fetch("/api/e", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => undefined);
  } catch {
    // Tracking never gets in the way.
  }
}

const dollars = (cents: number | undefined) =>
  cents === undefined ? undefined : Math.round(cents) / 100;

function metaData(params: TrackParams) {
  const value = dollars(params.food_value ?? params.value);
  const contents = params.items?.map((i) => ({
    id: i.id,
    quantity: i.quantity,
    item_price: dollars(i.price),
  }));
  return {
    ...(value !== undefined ? { value, currency: "USD" } : {}),
    ...(params.item_id ? { content_ids: [params.item_id], content_type: "product" } : {}),
    ...(contents?.length
      ? {
          contents,
          content_ids: contents.map((c) => c.id),
          content_type: "product",
          num_items: contents.reduce((n, c) => n + c.quantity, 0),
        }
      : {}),
  };
}

function ga4Data(name: BrowserEvent, params: TrackParams) {
  const value = dollars(params.value);
  return {
    ...(value !== undefined ? { value, currency: "USD" } : {}),
    ...(params.items
      ? {
          items: params.items.map((i) => ({
            item_id: i.id,
            item_name: i.name,
            price: dollars(i.price),
            quantity: i.quantity,
          })),
        }
      : params.item_id
        ? { items: [{ item_id: params.item_id }] }
        : {}),
    ...(name === "purchase" && params.order_ref
      ? { transaction_id: params.order_ref, shipping: dollars(params.shipping) ?? 0 }
      : {}),
    ...cleanParams(
      Object.fromEntries(
        Object.entries(params).filter(
          ([k]) =>
            ![
              "item_id",
              "value",
              "food_value",
              "shipping",
              "items",
              "order_ref",
              "page_title",
              "page_location",
            ].includes(k),
        ),
      ),
    ),
    ...(typeof params.page_location === "string"
      ? { page_location: params.page_location, page_title: params.page_title }
      : {}),
  };
}

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/** Records something a visitor did, everywhere it's configured to go. */
export function track(name: BrowserEvent, params: TrackParams = {}) {
  if (typeof window === "undefined") return;
  const meta = metaName(name);
  const metaEventId = meta
    ? name === "purchase" && params.order_ref
      ? purchaseEventId(params.order_ref)
      : `${meta}:${randomId()}`
    : undefined;

  sendFirstParty(name, params, metaEventId);
  debug("track", name, params);

  try {
    if (meta && metaOn()) {
      seedMetaCookies();
      metaInit(metaMatching(visitorSession().visitorId));
      metaTrack(meta, metaData(params), metaEventId!);
    }
    const ga4 = ga4Name(name);
    if (ga4) ga4Event(ga4, ga4Data(name, params));
    if (name === "purchase" && params.order_ref)
      adsPurchase(params.order_ref, dollars(params.food_value ?? params.value) ?? 0);
  } catch {
    // A platform's script misbehaving never breaks the page.
  }
}

let lastPage = "";

/** A page view, once per address (client-side navigations included). */
export function trackPageView() {
  const path = currentPath();
  if (path === lastPage) return;
  lastPage = path;
  googleInit();
  applyCustomer();
  track("page_view", {
    page_title: document.title,
    page_location: cleanUrl(location.href, { stripTracking: false, max: 1000 }),
  });
}
