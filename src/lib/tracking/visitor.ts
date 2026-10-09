// The browser's visitor and visit, ported from Thirty's visitorSession.ts.
//
// A visitor is one browser (kept in localStorage). A visit ends after 30
// minutes without activity and spans tabs, as in Google Analytics: a visit
// kept per tab turned every link opened in a new tab, or Instagram's browser
// rebuilding its page, into a new "visit" referred by the site itself.
import { cleanUrl } from "./sanitize";

const VISITOR_KEY = "tss-visitor";
const VISIT_KEY = "tss-visit";
export const VISIT_TIMEOUT_MS = 30 * 60 * 1000;

type Visit = { id: string; last: number; landing: string };

let memoryVisitor: string | null = null;
let memoryVisit: Visit | null = null;

const newId = (prefix: string) =>
  `${prefix}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`}`;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string) {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Private mode or storage off: the memory copy keeps this page consistent.
  }
}

function readVisit(): Visit | null {
  try {
    const parsed = JSON.parse(read(VISIT_KEY) ?? "null") as Partial<Visit> | null;
    return parsed && typeof parsed.id === "string" && typeof parsed.last === "number"
      ? { id: parsed.id, last: parsed.last, landing: parsed.landing ?? "" }
      : null;
  } catch {
    return null;
  }
}

/**
 * This browser's ids, extending the visit (every event is activity). A new
 * visit remembers its landing page: the page it starts on.
 */
export function visitorSession() {
  let visitorId = read(VISITOR_KEY) ?? memoryVisitor;
  if (!visitorId) visitorId = newId("v");
  memoryVisitor = visitorId;
  write(VISITOR_KEY, visitorId);

  const now = Date.now();
  const stored = readVisit() ?? memoryVisit;
  const idle = stored ? now - stored.last : Infinity;
  // A clock that went backwards starts a new visit rather than extending one.
  const live = stored && idle >= 0 && idle < VISIT_TIMEOUT_MS;
  const visit: Visit = live
    ? { ...stored, last: now }
    : { id: newId("s"), last: now, landing: currentPath() };
  memoryVisit = visit;
  write(VISIT_KEY, JSON.stringify(visit));
  return { visitorId, visitId: visit.id, landingPage: visit.landing, newVisit: !live };
}

/** This page's path and query, without secrets or tracking tags. */
export const currentPath = () => cleanUrl(`${window.location.pathname}${window.location.search}`);

/** The campaign tags and click ids in this page's address. */
export function campaignTags() {
  const params = new URLSearchParams(window.location.search);
  const tags: Record<string, string> = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "gclid",
    "fbclid",
  ]) {
    const value = params.get(key)?.trim();
    if (value) tags[key] = value.slice(0, 300);
  }
  return tags;
}

export function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
