import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketingReport } from "./marketing-report";
import { OrdersReport } from "./orders-report";
import { Overview } from "./overview";
import { readPeriod } from "./period";
import type { MarketingData, OrdersData, WebData } from "./types";
import { WebReport } from "./web-report";

const period = readPeriod({ period: "7d" }, "2026-10-09");
const days = [
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];

const emptyOrders: OrdersData = {
  totals: {
    placed: 0,
    orders: 0,
    open: 0,
    completed: 0,
    cancelled: 0,
    sales_cents: 0,
    food_cents: 0,
    discount_cents: 0,
    delivery_cents: 0,
    customers: 0,
    new_customers: 0,
    items: 0,
  },
  daily: days.map((day) => ({ day, orders: 0, sales_cents: 0, cancelled: 0 })),
  fulfilment: [],
  zones: [],
  heatmap: [],
  timings: {
    to_start: null,
    to_ready: null,
    pickup_total: null,
    delivery_total: null,
    late: 0,
    timed: 0,
  },
  cancel_reasons: [],
  basket: [],
  items: [],
  options: [],
  attach: { lines: 0, with_add_ons: 0 },
  codes: [],
};

const orders: OrdersData = {
  ...emptyOrders,
  totals: {
    ...emptyOrders.totals,
    placed: 3,
    orders: 2,
    open: 1,
    completed: 1,
    cancelled: 1,
    sales_cents: 2000,
    food_cents: 1800,
    delivery_cents: 200,
    customers: 2,
    new_customers: 1,
    items: 3,
  },
  daily: days.map((day, i) => ({
    day,
    orders: i === 6 ? 2 : 0,
    sales_cents: i === 6 ? 2000 : 0,
    cancelled: 0,
  })),
  fulfilment: [
    { name: "pickup", orders: 1, sales_cents: 1300 },
    { name: "delivery", orders: 1, sales_cents: 700 },
  ],
  zones: [{ name: "Mina", orders: 1, sales_cents: 700 }],
  heatmap: [{ dow: 5, hour: 21, value: 2 }],
  timings: {
    to_start: 3.5,
    to_ready: 9,
    pickup_total: 14,
    delivery_total: null,
    late: 0,
    timed: 1,
  },
  cancel_reasons: [{ name: "Customer asked to cancel", orders: 1 }],
  basket: [
    { name: 1, orders: 1 },
    { name: 2, orders: 1 },
  ],
  items: [{ id: "lotus-crepe", name: "Lotus Crêpe", quantity: 2, sales_cents: 1300 }],
  options: [{ name: "Banana", quantity: 2, sales_cents: 300 }],
  attach: { lines: 2, with_add_ons: 1 },
  codes: [{ name: "SWEET20", orders: 1, discount_cents: 200, sales_cents: 800 }],
};

const emptyWeb: WebData = {
  totals: {
    visits: 0,
    visitors: 0,
    new_visitors: 0,
    engaged: 0,
    page_views: 0,
    item_views: 0,
    carts: 0,
    checkouts: 0,
    orders: 0,
  },
  daily: days.map((day) => ({ day, visits: 0, orders: 0 })),
  channels: [],
  sources: [],
  devices: [],
  languages: [],
  returning: [],
  landing_pages: [],
  exit_pages: [],
  items: [],
  heatmap: [],
  abandoned: [],
  popup: { viewed: 0, clicked: 0, copied: 0, dismissed: 0 },
  problems: { errors: 0, not_found: 0, failed_orders: 0 },
  ga4: { countries: [], cities: [], audience: [], engagement_seconds: null, sessions: null },
};

const web: WebData = {
  ...emptyWeb,
  totals: {
    visits: 3,
    visitors: 3,
    new_visitors: 3,
    engaged: 3,
    page_views: 3,
    item_views: 1,
    carts: 3,
    checkouts: 1,
    orders: 2,
  },
  channels: [
    { name: "Paid social", visits: 1, orders: 1 },
    { name: "Direct", visits: 1, orders: 1 },
  ],
  devices: [{ name: "mobile", visits: 2, orders: 1 }],
  languages: [{ name: "ar", visits: 1, orders: 1 }],
  items: [{ id: "lotus-crepe", views: 1, adds: 2 }],
  abandoned: [
    {
      visit: "s",
      at: "2026-10-09T10:00:00Z",
      step: "cart",
      channel: "Organic search",
      device: "mobile",
      value_cents: 500,
    },
  ],
  ga4: { ...emptyWeb.ga4, engagement_seconds: 75, sessions: 4 },
};

const emptyMarketing: MarketingData = {
  spend: { total_cents: 0, meta_cents: 0, google_cents: 0, manual_cents: 0 },
  daily: days.map((day) => ({ day, spend_cents: 0, ad_orders: 0, ad_sales_cents: 0 })),
  credit: { orders: 0, sales_cents: 0, ad_orders: 0, ad_sales_cents: 0, ad_food_cents: 0 },
  channels: [],
  campaigns_credit: [],
  meta: {
    impressions: 0,
    clicks: 0,
    link_clicks: 0,
    landing_page_views: 0,
    add_to_cart: 0,
    initiate_checkout: 0,
    purchases: 0,
    purchase_value_cents: 0,
    messaging_started: 0,
    profile_visits: 0,
    video_views: 0,
  },
  funnel: { paid_visits: 0, paid_carts: 0, paid_checkouts: 0, ad_orders: 0, ad_completed: 0 },
  campaigns: [],
  placements: [],
  manual: [],
  codes: [],
  social: {},
  search: { clicks: 0, impressions: 0, position: null, queries: [], pages: [] },
};

const marketing: MarketingData = {
  ...emptyMarketing,
  spend: { total_cents: 1000, meta_cents: 1000, google_cents: 0, manual_cents: 0 },
  credit: { orders: 2, sales_cents: 2000, ad_orders: 1, ad_sales_cents: 1300, ad_food_cents: 1300 },
  channels: [{ name: "Paid social", visits: 1, orders: 1, sales_cents: 1300 }],
  campaigns: [
    {
      id: "c1",
      name: "Launch",
      platform: "meta",
      spend_cents: 1000,
      impressions: 2000,
      link_clicks: 50,
      meta_purchases: 1,
      messaging_started: null,
      orders: 1,
      sales_cents: 1300,
      ads: [
        {
          id: "a1",
          name: "Reel 1",
          adset: "",
          spend_cents: 1000,
          impressions: 2000,
          link_clicks: 50,
          meta_purchases: 1,
          orders: 1,
        },
      ],
    },
  ],
  social: {
    instagram: {
      followers: 1200,
      new_followers: 6,
      reach: 420,
      views: null,
      interactions: 30,
      profile_views: 31,
      website_clicks: 4,
      daily: [{ day: days[6], reach: 420, new_followers: 6, interactions: 30 }],
    },
  },
  search: {
    clicks: 3,
    impressions: 40,
    position: 2.5,
    queries: [{ name: "crepes tripoli", clicks: 3, impressions: 40, position: 2.5 }],
    pages: [],
  },
};

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(element);

describe("dashboards render", () => {
  it("with nothing yet", () => {
    for (const html of [
      render(
        createElement(Overview, {
          period,
          orders: emptyOrders,
          ordersBefore: emptyOrders,
          web: emptyWeb,
          webBefore: emptyWeb,
          marketing: emptyMarketing,
          attention: [],
        }),
      ),
      render(createElement(OrdersReport, { period, data: emptyOrders, before: emptyOrders })),
      render(
        createElement(MarketingReport, { period, data: emptyMarketing, before: emptyMarketing }),
      ),
      render(createElement(WebReport, { period, data: emptyWeb, before: emptyWeb, itemNames: {} })),
    ])
      expect(html).not.toContain("NaN");
  });

  it("with orders, visits and ads", () => {
    const overview = render(
      createElement(Overview, {
        period,
        orders,
        ordersBefore: emptyOrders,
        web,
        webBefore: emptyWeb,
        marketing,
        attention: [{ text: "1 order waiting", href: "/admin/orders", tone: "bad" }],
      }),
    );
    expect(overview).toContain("$20.00");
    expect(overview).toContain("1 order waiting");
    const ordersHtml = render(
      createElement(OrdersReport, { period, data: orders, before: emptyOrders }),
    );
    expect(ordersHtml).toContain("Lotus Crêpe");
    expect(ordersHtml).toContain("14 min");
    const marketingHtml = render(
      createElement(MarketingReport, { period, data: marketing, before: emptyMarketing }),
    );
    expect(marketingHtml).toContain("Launch");
    expect(marketingHtml).toContain("$1.30");
    const webHtml = render(
      createElement(WebReport, {
        period,
        data: web,
        before: emptyWeb,
        itemNames: { "lotus-crepe": "Lotus Crêpe" },
      }),
    );
    expect(webHtml).toContain("Lotus Crêpe");
    expect(webHtml).toContain("1 min 15 s");
    for (const html of [overview, ordersHtml, marketingHtml, webHtml])
      expect(html).not.toContain("NaN");
  });
});
