// What the dashboard functions return (supabase/migrations/…_dashboards.sql).

type Named = { name: string };
type Cell = { dow: number; hour: number; value: number };

export type OrdersData = {
  totals: {
    placed: number;
    orders: number;
    open: number;
    completed: number;
    cancelled: number;
    sales_cents: number;
    food_cents: number;
    discount_cents: number;
    delivery_cents: number;
    customers: number;
    new_customers: number;
    items: number;
  };
  daily: { day: string; orders: number; sales_cents: number; cancelled: number }[];
  fulfilment: (Named & { orders: number; sales_cents: number })[];
  zones: (Named & { orders: number; sales_cents: number })[];
  heatmap: Cell[];
  timings: {
    to_start: number | null;
    to_ready: number | null;
    pickup_total: number | null;
    delivery_total: number | null;
    late: number;
    timed: number;
  };
  cancel_reasons: (Named & { orders: number })[];
  basket: { name: number; orders: number }[];
  items: { id: string; name: string; quantity: number; sales_cents: number }[];
  options: (Named & { quantity: number; sales_cents: number })[];
  attach: { lines: number; with_add_ons: number };
  codes: (Named & { orders: number; discount_cents: number; sales_cents: number })[];
};

export type WebData = {
  totals: {
    visits: number;
    visitors: number;
    new_visitors: number;
    engaged: number;
    page_views: number;
    item_views: number;
    carts: number;
    checkouts: number;
    orders: number;
  };
  daily: { day: string; visits: number; orders: number }[];
  channels: (Named & { visits: number; orders: number })[];
  sources: (Named & { visits: number; orders: number })[];
  devices: (Named & { visits: number; orders: number })[];
  languages: (Named & { visits: number; orders: number })[];
  returning: (Named & { visits: number; orders: number })[];
  landing_pages: (Named & { visits: number; orders: number })[];
  exit_pages: (Named & { visits: number })[];
  items: { id: string; views: number; adds: number }[];
  heatmap: Cell[];
  abandoned: {
    visit: string;
    at: string;
    step: "cart" | "checkout";
    channel: string;
    device: string | null;
    value_cents: number | null;
  }[];
  popup: { viewed: number; clicked: number; copied: number; dismissed: number };
  problems: { errors: number; not_found: number; failed_orders: number };
  ga4: {
    countries: (Named & { visits: number })[];
    cities: (Named & { visits: number })[];
    audience: (Named & { users: number })[];
    engagement_seconds: number | null;
    sessions: number | null;
  };
};

export type Campaign = {
  id: string;
  name: string;
  platform: "meta" | "google";
  spend_cents: number;
  impressions: number | null;
  link_clicks: number | null;
  meta_purchases: number | null;
  messaging_started: number | null;
  orders: number;
  sales_cents: number;
  ads: {
    id: string;
    name: string;
    adset: string;
    spend_cents: number;
    impressions: number | null;
    link_clicks: number | null;
    meta_purchases: number | null;
    orders: number;
  }[];
};

type Social = {
  followers: number | null;
  new_followers: number | null;
  reach: number | null;
  views: number | null;
  interactions: number | null;
  profile_views: number | null;
  website_clicks: number | null;
  daily: {
    day: string;
    reach: number | null;
    new_followers: number | null;
    interactions: number | null;
  }[];
};

export type MarketingData = {
  spend: { total_cents: number; meta_cents: number; google_cents: number; manual_cents: number };
  daily: { day: string; spend_cents: number; ad_orders: number; ad_sales_cents: number }[];
  credit: {
    orders: number;
    sales_cents: number;
    ad_orders: number;
    ad_sales_cents: number;
    ad_food_cents: number;
  };
  channels: (Named & { visits: number; orders: number; sales_cents: number })[];
  campaigns_credit: (Named & { source: string; orders: number; sales_cents: number })[];
  meta: {
    impressions: number;
    clicks: number;
    link_clicks: number;
    landing_page_views: number;
    add_to_cart: number;
    initiate_checkout: number;
    purchases: number;
    purchase_value_cents: number;
    messaging_started: number;
    profile_visits: number;
    video_views: number;
  };
  funnel: {
    paid_visits: number;
    paid_carts: number;
    paid_checkouts: number;
    ad_orders: number;
    ad_completed: number;
  };
  campaigns: Campaign[];
  placements: (Named & {
    spend_cents: number;
    impressions: number | null;
    link_clicks: number | null;
    meta_purchases: number | null;
  })[];
  manual: (Named & { spend_cents: number })[];
  codes: (Named & { orders: number; discount_cents: number; sales_cents: number })[];
  social: { instagram?: Social; facebook?: Social };
  search: {
    clicks: number;
    impressions: number;
    position: number | null;
    queries: (Named & { clicks: number; impressions: number; position: number | null })[];
    pages: (Named & { clicks: number; impressions: number })[];
  };
};
