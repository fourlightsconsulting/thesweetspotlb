// GA4 and Google Ads on one gtag.js (two `config`s on the same script, never
// two scripts: a second copy double-counts conversions), ported from Thirty.
// The Ads tag loads on every page, not just checkout: it reads the ad's
// `gclid` on the landing page, and a purchase without it can't be credited.
import { adsOn, debug, ga4On, tags } from "./config";
import { loadScript } from "./scheduler";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let configured = false;

function gtag(...args: unknown[]) {
  if (!window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    // Google's own stub: it pushes the `arguments` object itself.
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag(...args);
}

/** Configures GA4 and Ads once; the script loads when the page is idle. */
export function googleInit() {
  if (configured || !(ga4On() || adsOn())) return configured;
  configured = true;
  gtag("js", new Date());
  // Page views are sent by hand on each navigation, so GA4's own are off
  // (and so must "page changes based on browser history" be in the stream).
  if (ga4On()) gtag("config", tags.ga4Id, { send_page_view: false });
  if (adsOn()) gtag("config", tags.adsId, { allow_enhanced_conversions: true });
  loadScript(
    "tss-gtag",
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4On() ? tags.ga4Id : tags.adsId)}`,
  );
  return true;
}

export function ga4Event(name: string, params: Record<string, unknown>) {
  if (!ga4On() || !googleInit()) return;
  gtag("event", name, { ...params, send_to: tags.ga4Id });
  debug("ga4", name, params);
}

let userDataSignature = "";

/** Enhanced conversions: the customer's details, for whatever the Ads tag sends next. */
export function googleUserData(data: {
  phone_number?: string;
  address?: { first_name?: string; last_name?: string; country: string };
}) {
  if (!adsOn() || !googleInit()) return;
  const signature = JSON.stringify(data);
  if (signature === userDataSignature) return;
  userDataSignature = signature;
  gtag("set", "user_data", data);
}

/** The purchase conversion, once per order (the order's reference is the transaction id). */
export function adsPurchase(orderRef: string, valueDollars: number) {
  if (!adsOn() || !tags.adsPurchaseLabel || !googleInit()) return;
  const payload = {
    send_to: `${tags.adsId}/${tags.adsPurchaseLabel}`,
    value: Number(valueDollars.toFixed(2)),
    currency: "USD",
    transaction_id: orderRef,
  };
  gtag("event", "conversion", payload);
  debug("ads", "conversion", payload);
}
