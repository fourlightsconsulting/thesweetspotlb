// Keeping personal data and secrets out of recorded URLs and parameters.

/** Query parameters that can carry secrets or personal data: always dropped. */
const SENSITIVE_PARAMS = new Set([
  "access_token",
  "refresh_token",
  "token",
  "id_token",
  "code",
  "password",
  "email",
  "phone",
  "name",
]);

/**
 * Campaign tags and click ids: recorded in their own columns, so stripped
 * from stored paths (otherwise every ad click becomes its own page).
 */
const TRACKING_PARAM =
  /^(fbclid|gclid|dclid|gbraid|wbraid|msclkid|ttclid|twclid|igshid|_gl|utm_[a-z_]+)$/i;

/** A path or URL without its fragment, secrets or (optionally) tracking tags. */
export function cleanUrl(value: string, { stripTracking = true, max = 300 } = {}) {
  if (!value) return "";
  try {
    const absolute = /^[a-z][a-z0-9+.-]*:/i.test(value);
    const url = new URL(value, "https://thesweetspotlb.com");
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase()) || (stripTracking && TRACKING_PARAM.test(key)))
        url.searchParams.delete(key);
    }
    const query = url.searchParams.toString();
    const path = `${url.pathname}${query ? `?${query}` : ""}`;
    return (absolute ? `${url.origin}${path}` : path).slice(0, max);
  } catch {
    return "";
  }
}

/** Keys that look like personal data or secrets: never recorded in params. */
const SENSITIVE_KEY =
  /(password|token|secret|authorization|email|phone|address|street|floor|name|note|card)/i;

/**
 * An event's extra parameters, flattened to short primitives: personal-data
 * keys dropped, at most 20 keys, strings cut to 200 characters.
 */
export function cleanParams(params: Record<string, unknown> | undefined) {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (Object.keys(out).length >= 20) break;
    if (!/^[a-z][a-z0-9_]{0,40}$/i.test(key) || SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string") out[key] = value.slice(0, 200);
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
  }
  return out;
}
