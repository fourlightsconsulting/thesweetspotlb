import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { beirutDate } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { site } from "@/data/site";
import { adminClient } from "@/lib/supabase/server";
import { needsAttention } from "@/server/admin/health";
import { atLeast, requireStaff } from "@/server/admin/session";
import { DashboardControls, RefreshButton } from "./dashboard/controls";
import { MarketingReport } from "./dashboard/marketing-report";
import { OrdersReport } from "./dashboard/orders-report";
import { Overview } from "./dashboard/overview";
import { type Period, readCompare, readPeriod } from "./dashboard/period";
import { type DashboardTab, dashboardTabs } from "./dashboard/tabs";
import type { MarketingData, OrdersData, WebData } from "./dashboard/types";
import { WebReport } from "./dashboard/web-report";

export const metadata: Metadata = { title: "Home" };

type Db = Awaited<ReturnType<typeof adminClient>>;

async function report<T>(
  db: Db,
  fn: "dashboard_orders" | "dashboard_web" | "dashboard_marketing",
  range: { from: string; to: string },
) {
  const { data, error } = await db.rpc(fn, { p_from: range.from, p_to: range.to });
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  return data as T;
}

type DashboardProps = { db: Db; tab: DashboardTab; period: Period; compare: boolean };

async function Dashboard({ db, tab, period, compare }: DashboardProps) {
  // The period before, for "vs previous"; null when that's switched off.
  const previous = <T,>(fn: Parameters<typeof report>[1]) =>
    compare ? report<T>(db, fn, period.previous) : Promise.resolve(null);
  switch (tab) {
    case "orders": {
      const [data, before] = await Promise.all([
        report<OrdersData>(db, "dashboard_orders", period),
        previous<OrdersData>("dashboard_orders"),
      ]);
      return <OrdersReport data={data} before={before} />;
    }
    case "marketing": {
      const [data, before] = await Promise.all([
        report<MarketingData>(db, "dashboard_marketing", period),
        previous<MarketingData>("dashboard_marketing"),
      ]);
      return <MarketingReport data={data} before={before} />;
    }
    case "web": {
      const [data, before, products] = await Promise.all([
        report<WebData>(db, "dashboard_web", period),
        previous<WebData>("dashboard_web"),
        db.from("products").select("slug, name_en"),
      ]);
      const names = Object.fromEntries((products.data ?? []).map((p) => [p.slug, p.name_en]));
      return <WebReport data={data} before={before} itemNames={names} />;
    }
    default: {
      const [orders, ordersBefore, web, webBefore, marketing, needs] = await Promise.all([
        report<OrdersData>(db, "dashboard_orders", period),
        previous<OrdersData>("dashboard_orders"),
        report<WebData>(db, "dashboard_web", period),
        previous<WebData>("dashboard_web"),
        report<MarketingData>(db, "dashboard_marketing", period),
        needsAttention(),
      ]);
      return (
        <Overview
          period={period}
          orders={orders}
          ordersBefore={ordersBefore}
          web={web}
          webBefore={webBefore}
          marketing={marketing}
          attention={needs}
        />
      );
    }
  }
}

/** "Good morning" by the shop's clock, whatever the device's. */
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: site.timeZone, hour: "numeric", hourCycle: "h23" })
      .format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const staff = await requireStaff();
  // The reports are for managers; the rest of the team starts on the orders.
  if (!atLeast(staff.role, "manager")) redirect("/admin/orders");
  const db = await adminClient();

  const params = await searchParams;
  const tab = dashboardTabs.find((t) => t.key === params.tab)?.key ?? "overview";
  const period = readPeriod(params);
  const compare = readCompare(params);

  return (
    <>
      <PageHeader
        eyebrow="Business pulse"
        title={`${greeting()}, ${staff.name.split(" ")[0]}`}
        help="Website orders only: in-store sales join once the shop’s Odoo is connected. Robots, the team’s own visits and test orders are left out."
        actions={<RefreshButton />}
      />
      <DashboardControls
        tab={tab}
        period={{ preset: period.preset, from: period.from, to: period.to }}
        compare={compare}
        today={beirutDate()}
      />
      <Dashboard db={db} tab={tab} period={period} compare={compare} />
    </>
  );
}
