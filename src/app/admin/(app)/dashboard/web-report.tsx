import {
  Bars,
  count,
  DataTable,
  Funnel,
  Heatmap,
  Kpi,
  KpiGrid,
  Panel,
  percent,
  TrendChart,
} from "@/components/admin/charts";
import { money, when } from "@/components/admin/format";
import { dayLabel } from "./period";
import type { WebData } from "./types";

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

const converting = (
  rows: { name: string; visits: number; orders: number }[],
  label: (n: string) => string = (n) => n,
) =>
  rows.map((r) => [
    label(r.name),
    count(r.visits),
    count(r.orders),
    percent(r.orders, r.visits, 1),
  ]);

const languageName = (code: string) =>
  code === "ar" ? "Arabic" : code === "en" ? "English" : "Not known";
const deviceName = (code: string) =>
  ({ mobile: "Phone", tablet: "Tablet", desktop: "Computer" })[code] ?? "Not known";

/** The website: visits, where they come from, what they do, where they stop. */
export function WebReport({
  data,
  before,
  itemNames,
}: {
  data: WebData;
  before: WebData;
  itemNames: Record<string, string>;
}) {
  const t = data.totals;
  const b = before.totals;
  const abandonment = ratio(t.checkouts - t.orders, t.checkouts);

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid>
        <Kpi label="Visits" value={count(t.visits)} now={t.visits} before={b.visits} />
        <Kpi
          label="New visitors"
          value={percent(t.new_visitors, t.visitors)}
          now={ratio(t.new_visitors, t.visitors)}
          before={ratio(b.new_visitors, b.visitors)}
        />
        <Kpi
          label="Engaged visits"
          value={percent(t.engaged, t.visits)}
          now={ratio(t.engaged, t.visits)}
          before={ratio(b.engaged, b.visits)}
          help="Saw two pages or more, or did something (opened an item, tapped a link)."
        />
        <Kpi
          label="Added to order"
          value={percent(t.carts, t.visits, 1)}
          now={ratio(t.carts, t.visits)}
          before={ratio(b.carts, b.visits)}
        />
        <Kpi
          label="Visits that ordered"
          value={percent(t.orders, t.visits, 1)}
          now={ratio(t.orders, t.visits)}
          before={ratio(b.orders, b.visits)}
        />
        <Kpi
          label="Left checkout"
          value={t.checkouts ? percent(t.checkouts - t.orders, t.checkouts) : "—"}
          now={abandonment}
          before={ratio(b.checkouts - b.orders, b.checkouts)}
          upIsGood={false}
          help="Went to checkout but didn’t order."
        />
      </KpiGrid>

      <Panel title="Visits by day">
        <TrendChart
          labels={data.daily.map((d) => dayLabel(d.day))}
          series={[
            { name: "Visits", values: data.daily.map((d) => d.visits) },
            {
              name: "Before",
              values: before.daily.map((d) => d.visits),
              tone: "muted",
              dashed: true,
            },
            { name: "Ordered", values: data.daily.map((d) => d.orders), tone: "wait" },
          ]}
        />
      </Panel>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="From visit to order">
          <Funnel
            steps={[
              { name: "Visits", value: t.visits },
              { name: "Opened an item", value: t.item_views },
              { name: "Added to order", value: t.carts },
              { name: "Went to checkout", value: t.checkouts },
              { name: "Ordered", value: t.orders },
            ]}
          />
        </Panel>
        <Panel title="Where visits come from">
          <Bars
            rows={data.channels.map((c) => ({
              name: c.name,
              value: c.visits,
              detail: `${percent(c.orders, c.visits, 1)} ordered`,
            }))}
            empty="No visits in this period."
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-3">
        <Panel title="Devices">
          <DataTable
            head={["", "Visits", "Orders", "Rate"]}
            rows={converting(data.devices, deviceName)}
          />
        </Panel>
        <Panel title="New or returning">
          <DataTable head={["", "Visits", "Orders", "Rate"]} rows={converting(data.returning)} />
        </Panel>
        <Panel title="Language">
          <DataTable
            head={["", "Visits", "Orders", "Rate"]}
            rows={converting(data.languages, languageName)}
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="Sources">
          <DataTable
            head={["Source", "Visits", "Orders", "Rate"]}
            rows={converting(data.sources)}
          />
        </Panel>
        <Panel title="Items: opened and added">
          <DataTable
            head={["Item", "Opened", "Added", "Rate"]}
            rows={data.items.map((i) => [
              itemNames[i.id] ?? i.id,
              count(i.views),
              count(i.adds),
              percent(i.adds, i.views),
            ])}
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="First pages">
          <DataTable
            head={["Page", "Visits", "Orders", "Rate"]}
            rows={converting(data.landing_pages)}
          />
        </Panel>
        <Panel title="Last pages" help="Where visits that didn’t order ended.">
          <DataTable
            head={["Page", "Visits"]}
            rows={data.exit_pages.map((p) => [p.name, count(p.visits)])}
          />
        </Panel>
      </div>

      <Panel title="When people visit">
        <Heatmap cells={data.heatmap} unit="visits" />
      </Panel>

      <Panel title="Left with something in their order">
        <DataTable
          head={["When", "Got to", "From", "Device", "Order value"]}
          rows={data.abandoned.map((a) => [
            when(a.at),
            a.step === "checkout" ? "Checkout" : "Order",
            a.channel,
            deviceName(a.device ?? ""),
            a.value_cents != null ? money(a.value_cents) : "—",
          ])}
          empty="Nobody left anything behind."
        />
      </Panel>

      <div className="grid gap-6 wide:grid-cols-3">
        <Panel title="Welcome popup">
          <DataTable
            head={["", "Times"]}
            rows={[
              ["Shown", count(data.popup.viewed)],
              [
                "Button tapped",
                `${count(data.popup.clicked)} (${percent(data.popup.clicked, data.popup.viewed)})`,
              ],
              ["Code copied", count(data.popup.copied)],
              ["Closed", count(data.popup.dismissed)],
            ]}
          />
        </Panel>
        <Panel title="Problems">
          <DataTable
            head={["", "Times"]}
            rows={[
              ["Page errors", count(data.problems.errors)],
              ["Pages not found", count(data.problems.not_found)],
              ["Checkouts that failed", count(data.problems.failed_orders)],
            ]}
          />
        </Panel>
        <Panel title="Google Analytics">
          <DataTable
            head={["", ""]}
            rows={[
              ["GA4 visits", count(data.ga4.sessions)],
              [
                "Time per visitor",
                data.ga4.engagement_seconds != null
                  ? `${Math.floor(data.ga4.engagement_seconds / 60)} min ${Math.round(data.ga4.engagement_seconds % 60)} s`
                  : "—",
              ],
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-3">
        <Panel title="Countries (GA4)">
          <Bars
            rows={data.ga4.countries.map((c) => ({ name: c.name, value: c.visits }))}
            empty="Shows once GA4 is connected."
          />
        </Panel>
        <Panel title="Cities (GA4)">
          <Bars
            rows={data.ga4.cities.map((c) => ({ name: c.name, value: c.visits }))}
            empty="Shows once GA4 is connected."
          />
        </Panel>
        <Panel
          title="Age and gender (GA4)"
          help="The last 90 days. Google hides groups too small to count."
        >
          <Bars
            rows={data.ga4.audience.map((a) => ({ name: a.name, value: a.users }))}
            empty="Shows once GA4 is connected."
          />
        </Panel>
      </div>
    </div>
  );
}
