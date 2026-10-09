import { site } from "@/data/site";

/**
 * Set on every admin visit, for the whole domain, so the public site knows
 * this browser belongs to staff (the admin is a different subdomain, so
 * nothing else it stores is visible to the site). It holds no session; its
 * only use is marking the team's own browsing and test orders as internal.
 */
export const STAFF_COOKIE = "tss_staff";

/** The cookie's domain: the live site and every subdomain, or this host only. */
export function staffCookieDomain(host: string | null) {
  const apex = new URL(site.url).hostname;
  const bare = (host ?? "").split(":")[0];
  return bare === apex || bare.endsWith(`.${apex}`) ? `.${apex}` : undefined;
}
