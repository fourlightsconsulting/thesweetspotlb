// The Meta pixel, ported from Thirty's metaPixel.ts and metaBrowserId.ts.
// Every event carries an event id; the server sends the same events through
// the Conversions API with the same ids, and Meta counts each once.
import { debug, tags } from "./config";
import { readCookie } from "./visitor";
import { loadScript } from "./scheduler";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Meta's advanced matching fields (fbevents.js hashes them in the browser). */
export type MetaMatching = {
  ph?: string;
  fn?: string;
  ln?: string;
  country?: string;
  external_id?: string;
};

function ensureFbq() {
  if (window.fbq) return window.fbq;
  const queue: unknown[] = [];
  const fbq: Fbq = (...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else queue.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = queue;
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

let initialisedWith = "";

/** Starts (or updates the matching of) the pixel; the script loads when the page is idle. */
export function metaInit(matching: MetaMatching) {
  const fbq = ensureFbq();
  loadScript("tss-meta", "https://connect.facebook.net/en_US/fbevents.js");
  const signature = JSON.stringify(Object.entries(matching).sort());
  if (signature !== initialisedWith) {
    fbq("init", tags.metaPixelId, matching);
    initialisedWith = signature;
    debug("meta", "init", Object.keys(matching));
  }
}

export function metaTrack(event: string, data: Record<string, unknown>, eventId: string) {
  window.fbq?.("track", event, data, { eventID: eventId });
  debug("meta", event, data, eventId);
}

/** The widest domain a cookie sticks to (".thesweetspotlb.com"), as fbevents uses. */
function cookieDomain() {
  const host = location.hostname;
  if (!host.includes(".") || /^[\d.]+$/.test(host)) return "";
  const parts = host.split(".");
  for (let i = parts.length - 2; i >= 0; i--) {
    const candidate = `.${parts.slice(i).join(".")}`;
    document.cookie = `tss_probe=1; domain=${candidate}; path=/; SameSite=Lax`;
    if (readCookie("tss_probe") === "1") {
      document.cookie = `tss_probe=; domain=${candidate}; path=/; max-age=0; SameSite=Lax`;
      return candidate;
    }
  }
  return "";
}

const NINETY_DAYS = 90 * 24 * 60 * 60;
let seeded = false;

/**
 * Writes Meta's browser cookies before fbevents.js arrives, so the first
 * events of a visit (and the server's copies) carry them: `_fbp` (the
 * browser) and, after an ad click, `_fbc` (the click). fbevents adopts
 * existing values rather than minting its own.
 */
export function seedMetaCookies() {
  if (seeded) return;
  seeded = true;
  try {
    const domain = cookieDomain();
    const attributes = `; path=/; max-age=${NINETY_DAYS}; SameSite=Lax${domain ? `; domain=${domain}` : ""}${location.protocol === "https:" ? "; Secure" : ""}`;
    if (!readCookie("_fbp")) {
      const random = Math.floor(Math.random() * 9e12) + 1e12;
      document.cookie = `_fbp=fb.1.${Date.now()}.${random}${attributes}`;
    }
    const fbclid = new URLSearchParams(location.search).get("fbclid");
    if (fbclid && !readCookie("_fbc")?.endsWith(fbclid)) {
      document.cookie = `_fbc=fb.1.${Date.now()}.${fbclid}${attributes}`;
    }
  } catch {
    // fbevents sets its own later: no worse than without this.
  }
}
