import { ago, when } from "@/components/admin/format";
import { DATABASE_LIMIT_BYTES } from "@/server/admin/attention";
import { megabytes, olderThan, scheduleLabel, type Status, usualPerHour } from "./status";
import type { HealthOverview } from "./types";

// The Health overview as plain data: each card's status and lines, the
// setup checklist, the imports and the scheduled jobs.

/** Which settings the website has (whether each is set, never its value). */
export type Setup = {
  ordersSave: boolean;
  whatsapp: boolean;
  metaPixel: boolean;
  metaCapi: boolean;
  ga4: boolean;
  googleAds: boolean;
};

export type Card = {
  key: string;
  title: string;
  status: Status;
  lines: string[];
  href: string;
  link: string;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The cards; WhatsApp alerts only when they're set up (they're paid and optional). */
export function healthCards(d: HealthOverview, setup: Setup, now = Date.now()): Card[] {
  return allCards(d, setup, now).filter((card) => card.key !== "alerts" || setup.whatsapp);
}

function allCards(d: HealthOverview, setup: Setup, now: number): Card[] {
  const phones = d.alert_settings?.phones?.length ?? 0;
  const alertsOn = d.alert_settings?.enabled !== false;
  const usual = usualPerHour(d.events.week);
  const dbShare = d.database.bytes / DATABASE_LIMIT_BYTES;
  // Failing until an alert has gone through since the last failure.
  const alertsFailing =
    !!d.alerts.last_error &&
    (!d.alerts.last_sent || Date.parse(d.alerts.last_sent) < Date.parse(d.alerts.last_error.at));

  return [
    {
      key: "orders",
      title: "Orders",
      status: !setup.ordersSave ? "off" : d.orders.waiting ? "wait" : "good",
      lines: [
        setup.ordersSave
          ? `${plural(d.orders.today, "order")} today${d.orders.tests_today ? ` (and ${plural(d.orders.tests_today, "test order")})` : ""}`
          : "Orders can’t save until SUPABASE_SECRET_KEY is set.",
        d.orders.waiting
          ? `${plural(d.orders.waiting, "order")} waiting over 10 minutes, the oldest for ${ago(d.orders.oldest_waiting!, new Date(now))}`
          : "Nothing waiting too long.",
        d.orders.last_order
          ? `Last order ${when(d.orders.last_order, new Date(now))}`
          : "No orders in the last 30 days.",
      ],
      href: "/admin/orders",
      link: "Orders",
    },
    {
      key: "alerts",
      title: "WhatsApp alerts",
      status: !setup.whatsapp
        ? "off"
        : !alertsOn || phones === 0
          ? "wait"
          : alertsFailing
            ? "bad"
            : d.alerts.failed || d.alerts.waiting
              ? "wait"
              : "good",
      lines: [
        !setup.whatsapp
          ? "Needs WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN on the website."
          : !alertsOn
            ? "Switched off in Store."
            : phones === 0
              ? "No numbers to alert: add them in Store."
              : `Alerts go to ${plural(phones, "number")}.`,
        `Last 7 days: ${d.alerts.sent} sent, ${d.alerts.failed} failed${d.alerts.waiting ? `, ${d.alerts.waiting} waiting` : ""}.`,
        ...(d.alerts.last_error
          ? [
              `Last failure ${when(d.alerts.last_error.at, new Date(now))}: ${d.alerts.last_error.error ?? "no details"}`,
            ]
          : []),
      ],
      href: "/admin/store",
      link: "Alert numbers",
    },
    {
      key: "tracking",
      title: "Website analytics",
      status: !d.events.last_at ? "wait" : olderThan(d.events.last_at, 24, now) ? "wait" : "good",
      lines: [
        `${plural(d.events.last_hour, "event")} in the last hour (usually about ${usual}).`,
        d.events.last_at
          ? `Last visitor event ${when(d.events.last_at, new Date(now))}.`
          : "No visitor events in the last 7 days.",
        `Left out in the last 24 hours: ${d.events.robots} from robots, ${d.events.staff} from staff browsing.`,
      ],
      href: "/admin/site",
      link: "Analytics switch",
    },
    {
      key: "meta",
      title: "Meta Conversions API",
      status: !setup.metaCapi ? "off" : d.relay.orders || d.relay.events ? "wait" : "good",
      lines: setup.metaCapi
        ? [
            d.relay.orders || d.relay.events
              ? `Waiting to reach Meta: ${plural(d.relay.orders, "order")} and ${plural(d.relay.events, "event")} (retried for 7 days).`
              : "Nothing waiting to send.",
            d.relay.last_sent
              ? `Last sent ${when(d.relay.last_sent, new Date(now))}.`
              : "Nothing sent yet.",
          ]
        : [
            "Needs META_CAPI_TOKEN and the pixel id on the website. Orders still reach Meta through the pixel in the browser.",
          ],
      href: "/admin/health",
      link: "",
    },
    {
      key: "database",
      title: "Database space",
      status: dbShare > 0.8 ? "bad" : dbShare > 0.6 ? "wait" : "good",
      lines: [
        `${megabytes(d.database.bytes)} of the free plan’s 500 MB (${Math.round(dbShare * 100)}%).`,
        `Website analytics takes ${megabytes(d.database.events_bytes)}. Switch it off in Site if space runs short; orders always save.`,
      ],
      href: "/admin/site",
      link: "Analytics switch",
    },
  ];
}

export type SetupRow = { name: string; done: boolean; text: string };

const jobState = (d: HealthOverview, job: string, needs: string): Omit<SetupRow, "name"> => {
  const run = d.jobs.find((j) => j.job === job);
  if (!run) return { done: false, text: "Hasn’t run yet." };
  if (run.outcome === "ok" || (run.outcome === "pending" && run.last_ok))
    return { done: true, text: "Connected." };
  if (run.outcome === "skipped") return { done: false, text: `Needs ${needs}.` };
  if (run.outcome === "pending") return { done: false, text: "Running for the first time." };
  return { done: false, text: `Failing: ${run.last_error ?? "no details"}` };
};

/**
 * Every connection the site uses, and whether it's in place. Paid WhatsApp
 * alerts are listed only once set up: orders reach the shop through the
 * customer's own WhatsApp message otherwise.
 */
export function setupRows(d: HealthOverview, setup: Setup): SetupRow[] {
  return allSetupRows(d, setup).filter(
    (row) => row.name !== "WhatsApp alerts for new orders" || setup.whatsapp,
  );
}

function allSetupRows(d: HealthOverview, setup: Setup): SetupRow[] {
  const phones = d.alert_settings?.phones?.length ?? 0;
  return [
    {
      name: "Orders save to the database",
      done: setup.ordersSave,
      text: setup.ordersSave ? "Set." : "Needs SUPABASE_SECRET_KEY on the website.",
    },
    {
      name: "WhatsApp alerts for new orders",
      done: setup.whatsapp && phones > 0,
      text: !setup.whatsapp
        ? "Needs WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN on the website, and the approved new_order_alert template."
        : phones === 0
          ? "Set; add the numbers to alert in Store."
          : "Set.",
    },
    {
      name: "Meta pixel",
      done: setup.metaPixel,
      text: setup.metaPixel ? "Set." : "Needs NEXT_PUBLIC_META_PIXEL_ID (then a new build).",
    },
    {
      name: "Meta Conversions API",
      done: setup.metaCapi,
      text: setup.metaCapi ? "Set." : "Needs META_CAPI_TOKEN on the website.",
    },
    {
      name: "Google Analytics (GA4)",
      done: setup.ga4,
      text: setup.ga4 ? "Set." : "Needs NEXT_PUBLIC_GA4_ID (then a new build).",
    },
    {
      name: "Google Ads purchase conversion",
      done: setup.googleAds,
      text: setup.googleAds
        ? "Set."
        : "Needs NEXT_PUBLIC_GOOGLE_ADS_ID and NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL (then a new build).",
    },
    {
      name: "Meta ads import",
      ...jobState(
        d,
        "meta-ads",
        "META_ADS_TOKEN and META_AD_ACCOUNT_ID as Supabase function secrets",
      ),
    },
    {
      name: "Instagram & Facebook import",
      ...jobState(d, "social", "META_ADS_TOKEN and META_PAGE_ID as Supabase function secrets"),
    },
    {
      name: "Google import (GA4, Search Console, Ads cost)",
      ...jobState(
        d,
        "google",
        "GOOGLE_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID and SEARCH_CONSOLE_SITE as Supabase function secrets",
      ),
    },
    {
      name: "Retries job (alerts and Meta)",
      ...jobState(d, "sweep", "the website to be live"),
    },
  ];
}

const sources = [
  { key: "meta", name: "Meta ads", job: "meta-ads", daily: false },
  { key: "instagram", name: "Instagram", job: "social", daily: false },
  { key: "facebook", name: "Facebook page", job: "social", daily: false },
  { key: "ga4", name: "Google Analytics", job: "google", daily: true },
  { key: "gsc", name: "Search Console", job: "google", daily: true },
  { key: "google_ads", name: "Google Ads cost", job: "google", daily: true },
] as const;

export type ImportRow = { name: string; latest: string; lastRun: string; status: Status };

/** How fresh each imported source is. */
export function importRows(d: HealthOverview, now = Date.now()): ImportRow[] {
  return sources.map((s) => {
    const fresh = d.imports[s.key];
    const run = d.jobs.find((j) => j.job === s.job);
    // Search Console runs about three days behind; the rest a day at most.
    const staleAfter = s.key === "gsc" ? 24 * 5 : 24 * 2;
    const status: Status = !run
      ? "off"
      : run.outcome === "failed" || run.outcome === "unknown"
        ? "bad"
        : run.outcome === "skipped"
          ? "off"
          : !fresh.day || olderThan(`${fresh.day}T23:59:59+03:00`, staleAfter, now)
            ? "wait"
            : "good";
    return {
      name: s.name,
      latest: fresh.day ?? "—",
      lastRun: run ? when(run.last_run, new Date(now)) : "—",
      status,
    };
  });
}

export type CronRow = {
  name: string;
  schedule: string;
  lastRun: string;
  status: Status;
  result: string;
};

const cronNames: Record<string, string> = {
  "meta-ads": "Meta ads import",
  social: "Instagram & Facebook import",
  google: "Google import",
  sweep: "Retries (alerts, Meta)",
  "reconcile-jobs": "Collect job results",
  "purge-event-pii": "Clear old IP addresses",
  housekeeping: "Tidy old job logs",
};

/**
 * pg_cron's jobs. For those that call out (the imports, the retries) the
 * outcome that matters is the call's, from job_runs; pg_cron only queues it.
 */
export function cronRows(d: HealthOverview, now = Date.now()): CronRow[] {
  return d.cron.map((c) => {
    const run = d.jobs.find((j) => j.job === c.name);
    let status: Status;
    let result: string;
    if (!c.active) {
      status = "off";
      result = "Switched off";
    } else if (run) {
      status =
        run.outcome === "ok"
          ? "good"
          : run.outcome === "skipped"
            ? "off"
            : run.outcome === "pending"
              ? "good"
              : "bad";
      result =
        run.outcome === "ok"
          ? "Worked"
          : run.outcome === "skipped"
            ? "Waiting for its settings"
            : run.outcome === "pending"
              ? "Running"
              : `Failed: ${run.last_error ?? "no details"}`;
    } else if (!c.status) {
      status = "good";
      result = "Hasn’t run yet";
    } else {
      status = c.status === "failed" ? "bad" : "good";
      result = c.status === "failed" ? `Failed: ${c.last_error ?? "no details"}` : "Worked";
    }
    return {
      name: cronNames[c.name] ?? c.name,
      schedule: scheduleLabel(c.schedule),
      lastRun: c.last_run ? when(c.last_run, new Date(now)) : "—",
      status,
      result,
    };
  });
}
