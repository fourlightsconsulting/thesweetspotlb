// Who's visiting, from the request: robots, device, browser, system.
// Ported from Thirty (lib/analytics, migration 205), where each rule was
// found the hard way; see the notes on each.

/**
 * Crawlers by user agent. `CUBOT` is an Android phone brand sold in Lebanon,
 * hence the trailing-non-letter match on `bot` and the exception below.
 * `google-ad` covers Google's ad landing-page checkers, which arrive with
 * made-up `gclid`s and look exactly like a campaign starting.
 */
export const CRAWLER_UA =
  /bot(?:[^a-z]|$)|crawl|spider|slurp|headless|lighthouse|externalhit|externalads|google-ad|google-agent|googleother|claudeseo|pagespeed|python-requests|go-http|curl\/|wget|google-read-aloud|google-inspectiontool|screenshot|^google$/i;
const PHONE_NOT_CRAWLER = /cubot/i;

/**
 * Why a visit is a robot, or null for a person: a robot's name in the user
 * agent, or a Linux computer on a clock other than Beirut's (hosted
 * automation such as Google's ad checker; Android phones in desktop mode
 * read Beirut time here).
 */
export function crawlerReason(userAgent: string, timeZone?: string | null) {
  if (CRAWLER_UA.test(userAgent) && !PHONE_NOT_CRAWLER.test(userAgent)) return "user_agent";
  if (
    /X11; Linux x86_64/i.test(userAgent) &&
    !/android/i.test(userAgent) &&
    timeZone &&
    timeZone !== "Asia/Beirut"
  )
    return "foreign_linux_desktop";
  return null;
}

export function deviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|blackberry|phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

/**
 * The browser, in-app ones first: Instagram's and Facebook's carry `Chrome/`
 * on Android, and paid traffic arrives through them. Chrome on iOS says
 * `CriOS`, never `Chrome`.
 */
export function browserName(userAgent: string) {
  const rules: [string, RegExp][] = [
    ["Instagram", /Instagram/],
    ["Facebook", /FBAV\/|FBAN\//],
    ["TikTok", /musical_ly|TikTok/i],
    ["Edge", /Edg(?:iOS|A)?\//],
    ["Opera", /OPR\//],
    ["Samsung Internet", /SamsungBrowser\//],
    ["Chrome", /(?:CriOS|Chrome)\//],
    ["Firefox", /(?:FxiOS|Firefox)\//],
    ["Safari", /Version\/[0-9.]+.*Safari/],
  ];
  return rules.find(([, rule]) => rule.test(userAgent))?.[0] ?? "Other";
}

export function osName(userAgent: string) {
  const rules: [string, RegExp][] = [
    ["iOS", /iPhone|iPad|iPod/],
    ["Android", /Android/],
    ["macOS", /Mac OS X/],
    ["Windows", /Windows NT/],
    ["Linux", /Linux/],
  ];
  return rules.find(([, rule]) => rule.test(userAgent))?.[0] ?? "Other";
}
