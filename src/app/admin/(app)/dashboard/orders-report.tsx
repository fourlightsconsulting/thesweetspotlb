import {
  Bars,
  count,
  DataTable,
  Heatmap,
  Kpi,
  KpiGrid,
  Panel,
  percent,
  TrendChart,
} from "@/components/admin/charts";
import { money } from "@/components/admin/format";
import { dayLabel } from "./period";
import type { OrdersData } from "./types";

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** Orders: how many, when, what's in them. */
export function OrdersReport({ data, before }: { data: OrdersData; before: OrdersData }) {
  const t = data.totals;
  const b = before.totals;
  const delivery = data.fulfilment.find((f) => f.name === "delivery")?.orders ?? 0;
  const deliveryBefore = before.fulfilment.find((f) => f.name === "delivery")?.orders ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid>
        <Kpi label="Orders" value={count(t.orders)} now={t.orders} before={b.orders} />
        <Kpi
          label="Sales"
          value={money(t.sales_cents)}
          now={t.sales_cents}
          before={b.sales_cents}
        />
        <Kpi
          label="Average order"
          value={money(Math.round(ratio(t.sales_cents, t.orders)))}
          now={ratio(t.sales_cents, t.orders)}
          before={ratio(b.sales_cents, b.orders)}
        />
        <Kpi
          label="Cancelled"
          value={percent(t.cancelled, t.placed)}
          now={ratio(t.cancelled, t.placed)}
          before={ratio(b.cancelled, b.placed)}
          upIsGood={false}
        />
        <Kpi
          label="Delivery"
          value={percent(delivery, t.orders)}
          now={ratio(delivery, t.orders)}
          before={ratio(deliveryBefore, b.orders)}
        />
        <Kpi
          label="Items per order"
          value={t.orders ? (t.items / t.orders).toFixed(1) : "—"}
          now={ratio(t.items, t.orders)}
          before={ratio(b.items, b.orders)}
        />
      </KpiGrid>

      <Panel title="Orders by day">
        <TrendChart
          labels={data.daily.map((d) => dayLabel(d.day))}
          series={[
            { name: "Orders", values: data.daily.map((d) => d.orders) },
            {
              name: "Before",
              values: before.daily.map((d) => d.orders),
              tone: "muted",
              dashed: true,
            },
            { name: "Cancelled", values: data.daily.map((d) => d.cancelled), tone: "bad" },
          ]}
        />
      </Panel>

      <Panel title="When people order">
        <Heatmap cells={data.heatmap} unit="orders" />
      </Panel>

      {/* No "Speed" panel while orders count as completed once placed: there are no times to show. */}
      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="Pickup or delivery">
          <Bars
            rows={data.fulfilment.map((f) => ({
              name: f.name === "delivery" ? "Delivery" : "Pickup",
              value: f.orders,
              detail: money(f.sales_cents),
            }))}
          />
        </Panel>
        <Panel title="Delivery areas">
          <Bars
            rows={data.zones.map((z) => ({
              name: z.name,
              value: z.orders,
              detail: money(z.sales_cents),
            }))}
            empty="No deliveries in this period."
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="Best sellers">
          <DataTable
            head={["Item", "Ordered", "Sales"]}
            rows={data.items.map((i) => [i.name, count(i.quantity), money(i.sales_cents)])}
          />
        </Panel>
        <Panel
          title="Add-ons"
          note={
            data.attach.lines
              ? `${percent(data.attach.with_add_ons, data.attach.lines)} of items had a paid add-on`
              : undefined
          }
        >
          <Bars
            rows={data.options.map((o) => ({
              name: o.name,
              value: o.quantity,
              detail: money(o.sales_cents),
            }))}
            empty="No paid add-ons in this period."
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-3">
        <Panel title="Items per order">
          <Bars
            rows={data.basket.map((s) => ({
              name: s.name >= 5 ? "5 or more" : String(s.name),
              value: s.orders,
            }))}
          />
        </Panel>
        <Panel title="Why orders were cancelled">
          <Bars
            rows={data.cancel_reasons.map((r) => ({ name: r.name, value: r.orders }))}
            tone="bad"
            empty="None cancelled."
          />
        </Panel>
        <Panel title="Codes used">
          <DataTable
            head={["Code", "Orders", "Off"]}
            rows={data.codes.map((c) => [c.name, count(c.orders), money(c.discount_cents)])}
            empty="No codes used."
          />
        </Panel>
      </div>
    </div>
  );
}
