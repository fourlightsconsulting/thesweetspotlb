import type { Metadata } from "next";
import { minutesAgo, startOfBeirutDay } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { storeStatus } from "@/lib/hours";
import { adminClient } from "@/lib/supabase/server";
import { getOrderingBranch, getSiteSettings } from "@/server/catalog";
import { atLeast, requireStaff } from "@/server/admin/session";
import { DashboardControls, type DashboardTab, dashboardTabs } from "./dashboard/controls";
import { MarketingReport } from "./dashboard/marketing-report";
import { OrdersReport } from "./dashboard/orders-report";
import { type Attention, Overview } from "./dashboard/overview";
import { type Period, readPeriod } from "./dashboard/period";
import type { MarketingData, OrdersData, WebData } from "./dashboard/types";
import { WebReport } from "./dashboard/web-report";
import { orderingNote } from "./store/ordering-note";
import { OrderingSwitch } from "./store/ordering-switch";

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

const jobNames: Record<string, string> = {
  "meta-ads": "Meta ads import",
  social: "Instagram & Facebook import",
  google: "Google import",
  sweep: "Retries job",
};

/** What a manager should look at now. */
async function attention(db: Db, ordering: string): Promise<Attention> {
  const [waiting, alerts, runs, settings] = await Promise.all([
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "received")
      .lt("placed_at", minutesAgo(10)),
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", minutesAgo(48 * 60)),
    db.from("job_runs").select("job, outcome").order("queued_at", { ascending: false }).limit(40),
    getSiteSettings(),
  ]);
  const items: Attention = [];
  if (waiting.count)
    items.push({
      text: `${waiting.count} order${waiting.count === 1 ? "" : "s"} waiting over 10 minutes to be started`,
      href: "/admin/orders",
      tone: "bad",
    });
  if (alerts.count)
    items.push({
      text: `${alerts.count} WhatsApp alert${alerts.count === 1 ? "" : "s"} didn’t send`,
      href: "/admin/store",
      tone: "bad",
    });
  const latest = new Map<string, string>();
  for (const run of runs.data ?? []) if (!latest.has(run.job)) latest.set(run.job, run.outcome);
  for (const [job, outcome] of latest)
    if (outcome === "failed" || outcome === "unknown")
      items.push({
        text: `The ${jobNames[job] ?? job} failed last time`,
        href: "/admin/connections",
        tone: "wait",
      });
  if (ordering === "open")
    items.push({
      text: "Online ordering is open whatever the hours",
      href: "/admin/store",
      tone: "wait",
    });
  if (!settings.tracking.first_party)
    items.push({ text: "Website analytics is switched off", href: "/admin/site", tone: "wait" });
  return items;
}

async function Dashboard({ db, tab, period }: { db: Db; tab: DashboardTab; period: Period }) {
  switch (tab) {
    case "orders": {
      const [data, before] = await Promise.all([
        report<OrdersData>(db, "dashboard_orders", period),
        report<OrdersData>(db, "dashboard_orders", period.previous),
      ]);
      return <OrdersReport period={period} data={data} before={before} />;
    }
    case "marketing": {
      const [data, before] = await Promise.all([
        report<MarketingData>(db, "dashboard_marketing", period),
        report<MarketingData>(db, "dashboard_marketing", period.previous),
      ]);
      return <MarketingReport period={period} data={data} before={before} />;
    }
    case "web": {
      const [data, before, products] = await Promise.all([
        report<WebData>(db, "dashboard_web", period),
        report<WebData>(db, "dashboard_web", period.previous),
        db.from("products").select("slug, name_en"),
      ]);
      const names = Object.fromEntries((products.data ?? []).map((p) => [p.slug, p.name_en]));
      return <WebReport period={period} data={data} before={before} itemNames={names} />;
    }
    default: {
      const branch = await getOrderingBranch();
      const [orders, ordersBefore, web, webBefore, marketing, needs] = await Promise.all([
        report<OrdersData>(db, "dashboard_orders", period),
        report<OrdersData>(db, "dashboard_orders", period.previous),
        report<WebData>(db, "dashboard_web", period),
        report<WebData>(db, "dashboard_web", period.previous),
        report<MarketingData>(db, "dashboard_marketing", period),
        attention(db, branch.schedule.ordering),
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

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const staff = await requireStaff();
  const manager = atLeast(staff.role, "manager");
  const db = await adminClient();
  const since = startOfBeirutDay();

  const [today, waiting, branch] = await Promise.all([
    db.from("orders").select("total_cents, status").gte("placed_at", since).eq("is_test", false),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "received"),
    getOrderingBranch(),
  ]);
  const orders = (today.data ?? []).filter((o) => o.status !== "cancelled");
  const revenue = orders.reduce((sum, o) => sum + Number(o.total_cents), 0);

  const tiles = [
    { label: "Orders today", value: String(orders.length) },
    { label: "Sales today", value: `$${(revenue / 100).toFixed(2)}` },
    {
      label: "Waiting to start",
      value: String(waiting.count ?? 0),
      tone: (waiting.count ?? 0) > 0 ? "text-wait" : "",
    },
  ];

  const params = await searchParams;
  const tab = dashboardTabs.find((t) => t.key === params.tab)?.key ?? "overview";
  const period = readPeriod(params);

  return (
    <>
      <PageHeader
        title={`Hi, ${staff.name.split(" ")[0]}`}
        description="Today at the Tripoli branch, in Beirut time."
      />
      <div className="grid grid-cols-2 gap-3 wide:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-[13px] text-muted">{tile.label}</p>
            <p className={`mt-1 text-2xl leading-8 font-bold tabular-nums ${tile.tone ?? ""}`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <OrderingSwitch
          value={branch.schedule.ordering}
          open={storeStatus(branch.schedule).open}
          note={orderingNote(branch.schedule)}
          canChange={manager}
        />
      </div>

      {manager && (
        <section aria-label="Reports" className="mt-10">
          <h2 className="mb-3 text-xl font-bold">Reports</h2>
          <DashboardControls
            tab={tab}
            period={{
              preset: period.preset,
              from: period.from,
              to: period.to,
              label: period.label,
            }}
          />
          <Dashboard db={db} tab={tab} period={period} />
        </section>
      )}
    </>
  );
}
