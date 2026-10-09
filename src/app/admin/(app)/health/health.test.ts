import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { type AttentionCounts, attentionItems } from "@/server/admin/attention";
import { cronRows, healthCards, importRows, setupRows } from "./cards";
import { problemTitle } from "./labels";
import { ProblemsTab } from "./problems";
import { scheduleLabel } from "./status";
import type { HealthOverview, HealthProblems } from "./types";

const quiet: AttentionCounts = {
  waiting: 0,
  alerts_failed: 0,
  alerts_stuck: 0,
  errors: 0,
  jobs_failed: [],
  cron_failed: [],
  relay_orders: 0,
  database_bytes: 20 * 1024 * 1024,
};
const settled = { ordering: "hours", firstParty: true, whatsapp: true, metaCapi: true } as const;

describe("needs attention", () => {
  it("is empty when all is well", () => {
    expect(attentionItems(quiet, settled)).toEqual([]);
  });

  it("lists problems, worst first", () => {
    const items = attentionItems(
      {
        ...quiet,
        waiting: 2,
        errors: 1,
        jobs_failed: ["sweep"],
        alerts_stuck: 3,
        relay_orders: 4,
        database_bytes: 450 * 1024 * 1024,
      },
      { ...settled, ordering: "paused" },
    );
    expect(items.map((i) => i.text)).toEqual([
      "2 orders waiting over 10 minutes to be started",
      "3 WhatsApp alerts still waiting to send",
      "1 problem for visitors on the website in the last 24 hours",
      "The retries job failed last time",
      "4 orders haven’t reached Meta yet",
      "Online ordering is paused",
      "The database is at 450 MB of the free plan’s 500 MB",
    ]);
  });

  it("doesn't flag queues for what isn't set up", () => {
    const items = attentionItems(
      { ...quiet, alerts_stuck: 3, relay_orders: 4 },
      { ...settled, whatsapp: false, metaCapi: false },
    );
    expect(items).toEqual([]);
  });
});

describe("labels", () => {
  it("reads pg_cron schedules", () => {
    expect(scheduleLabel("*/10 * * * *")).toBe("Every 10 minutes");
    expect(scheduleLabel("10 * * * *")).toBe("Hourly");
    expect(scheduleLabel("20 */6 * * *")).toBe("Every 6 hours");
    expect(scheduleLabel("30 22 * * *")).toBe("Daily");
    expect(scheduleLabel("0 9 * * 1")).toBe("0 9 * * 1");
  });

  it("names problems", () => {
    expect(problemTitle("place_order_failed", "closed")).toBe(
      "Tried to order while the shop was closed or paused",
    );
    expect(problemTitle("promo_rejected", "expired")).toBe("Code refused: Code has expired");
    expect(problemTitle("not_found", "/wp-admin")).toBe("Page not found: /wp-admin");
    expect(problemTitle("client_error", "")).toBe("Page error: no message");
  });
});

const overview: HealthOverview = {
  orders: { today: 3, tests_today: 1, waiting: 0, oldest_waiting: null, last_order: null },
  alerts: { sent: 3, failed: 0, waiting: 0, last_sent: null, last_error: null },
  alert_settings: { enabled: true, phones: ["+96170000000"] },
  events: {
    last_hour: 4,
    week: 336,
    robots: 2,
    staff: 5,
    last_at: "2026-10-09T09:00:00Z",
    last_any: null,
  },
  relay: { orders: 0, events: 0, last_sent: null },
  imports: {
    meta: { day: "2026-10-09", at: "2026-10-09T08:10:00Z" },
    google_ads: { day: null, at: null },
    ga4: { day: null, at: null },
    gsc: { day: null, at: null },
    instagram: { day: null, at: null },
    facebook: { day: null, at: null },
  },
  jobs: [
    {
      job: "meta-ads",
      outcome: "ok",
      last_run: "2026-10-09T08:10:00Z",
      last_ok: "2026-10-09T08:10:00Z",
      failed_24h: 0,
      last_error: null,
    },
    {
      job: "google",
      outcome: "skipped",
      last_run: "2026-10-09T06:00:00Z",
      last_ok: null,
      failed_24h: 0,
      last_error: null,
    },
    {
      job: "sweep",
      outcome: "failed",
      last_run: "2026-10-09T09:00:00Z",
      last_ok: null,
      failed_24h: 17,
      last_error: "HTTP 404",
    },
  ],
  cron: [
    {
      name: "sweep",
      schedule: "*/10 * * * *",
      active: true,
      last_run: "2026-10-09T09:00:00Z",
      status: "succeeded",
      last_error: null,
      failed_24h: 0,
    },
    {
      name: "purge-event-pii",
      schedule: "15 3 * * *",
      active: true,
      last_run: null,
      status: null,
      last_error: null,
      failed_24h: 0,
    },
  ],
  database: { bytes: 15 * 1024 * 1024, events_bytes: 200_000 },
};
const setup = {
  ordersSave: true,
  whatsapp: true,
  metaPixel: false,
  metaCapi: false,
  ga4: false,
  googleAds: false,
};
const now = Date.parse("2026-10-09T10:00:00Z");

describe("health overview", () => {
  it("rates each part", () => {
    const cards = Object.fromEntries(healthCards(overview, setup, now).map((c) => [c.key, c]));
    expect(cards.orders.status).toBe("good");
    expect(cards.orders.lines[0]).toBe("3 orders today (and 1 test order)");
    expect(cards.alerts.status).toBe("good");
    expect(cards.tracking.lines[0]).toBe("4 events in the last hour (usually about 2).");
    expect(cards.meta.status).toBe("off");
    expect(cards.database.status).toBe("good");
  });

  it("leaves out paid WhatsApp alerts until they're set up", () => {
    const off = { ...setup, whatsapp: false };
    expect(healthCards(overview, off, now).map((c) => c.key)).not.toContain("alerts");
    expect(setupRows(overview, off).map((r) => r.name)).not.toContain(
      "WhatsApp alerts for new orders",
    );
  });

  it("lists what's connected", () => {
    const rows = Object.fromEntries(setupRows(overview, setup).map((r) => [r.name, r]));
    expect(rows["Meta ads import"].done).toBe(true);
    expect(rows["Google import (GA4, Search Console, Ads cost)"].text).toContain(
      "GOOGLE_SERVICE_ACCOUNT_JSON",
    );
    expect(rows["Retries job (alerts and Meta)"].text).toBe("Failing: HTTP 404");
    expect(rows["Meta pixel"].done).toBe(false);
  });

  it("shows imports and jobs by their real outcome", () => {
    const imports = Object.fromEntries(importRows(overview, now).map((r) => [r.name, r]));
    expect(imports["Meta ads"].status).toBe("good");
    expect(imports["Google Analytics"].status).toBe("off");
    expect(imports.Instagram.status).toBe("off");
    const jobs = cronRows(overview, now);
    expect(jobs[0]).toMatchObject({
      name: "Retries (alerts, Meta)",
      status: "bad",
      result: "Failed: HTTP 404",
    });
    expect(jobs[1]).toMatchObject({ schedule: "Daily", result: "Hasn’t run yet" });
  });
});

describe("problems tab", () => {
  it("renders groups and visits", () => {
    const data: HealthProblems = {
      counts: { attention: 1, friction: 1, handled: 0 },
      groups: [
        {
          bucket: "attention",
          event: "client_error",
          detail: "x is undefined",
          handled: "",
          times: 2,
          visits: 1,
          last_seen: "2026-10-09T09:00:00Z",
          latest_visit: "s1",
          pages: ["/en/order"],
          codes: null,
          sources: null,
          browsers: ["Safari"],
        },
        {
          bucket: "friction",
          event: "promo_rejected",
          detail: "expired",
          handled: "",
          times: 1,
          visits: 1,
          last_seen: "2026-10-09T09:00:00Z",
          latest_visit: "s1",
          pages: null,
          codes: ["SWEET10"],
          sources: null,
          browsers: null,
        },
      ],
      visits: [
        {
          visit_id: "s1",
          first_at: "2026-10-09T08:59:00Z",
          last_at: "2026-10-09T09:00:00Z",
          problems: 3,
          attention: true,
          device: "mobile",
          browser: "Safari",
          os: "iOS",
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(ProblemsTab, { data, range: "7d", bucket: null }),
    );
    expect(html).toContain("Page error: x is undefined");
    expect(html).toContain("Typed: SWEET10");
    expect(html).toContain("/admin/health?tab=visit&amp;visit=s1");
    expect(html).toContain("Phone · Safari · iOS");
  });
});
