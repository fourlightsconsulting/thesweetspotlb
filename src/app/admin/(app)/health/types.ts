import type { Bucket } from "./labels";

// The shapes health_overview() and health_problems() return.

type Freshness = { day: string | null; at: string | null };

export type HealthOverview = {
  orders: {
    today: number;
    tests_today: number;
    waiting: number;
    oldest_waiting: string | null;
    last_order: string | null;
  };
  alerts: {
    sent: number;
    failed: number;
    waiting: number;
    last_sent: string | null;
    last_error: { at: string; error: string | null } | null;
  };
  alert_settings: { enabled?: boolean; phones?: string[] } | null;
  events: {
    last_hour: number;
    week: number;
    robots: number;
    staff: number;
    last_at: string | null;
    last_any: string | null;
  };
  relay: { orders: number; events: number; last_sent: string | null };
  imports: Record<"meta" | "google_ads" | "ga4" | "gsc" | "instagram" | "facebook", Freshness>;
  jobs: {
    job: string;
    outcome: "pending" | "ok" | "skipped" | "failed" | "unknown";
    last_run: string;
    last_ok: string | null;
    failed_24h: number;
    last_error: string | null;
  }[];
  cron: {
    name: string;
    schedule: string;
    active: boolean;
    last_run: string | null;
    status: string | null;
    last_error: string | null;
    failed_24h: number;
  }[];
  database: { bytes: number; events_bytes: number };
};

export type ProblemGroup = {
  bucket: Bucket;
  event: string;
  detail: string;
  handled: string;
  times: number;
  visits: number;
  last_seen: string;
  latest_visit: string | null;
  pages: string[] | null;
  codes: string[] | null;
  sources: string[] | null;
  browsers: string[] | null;
};

export type ProblemVisit = {
  visit_id: string;
  first_at: string;
  last_at: string;
  problems: number;
  attention: boolean;
  device: string | null;
  browser: string | null;
  os: string | null;
};

export type HealthProblems = {
  counts: Record<Bucket, number>;
  groups: ProblemGroup[];
  visits: ProblemVisit[];
};
