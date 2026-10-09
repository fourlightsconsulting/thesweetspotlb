import { Bars, Kpi, KpiGrid, Panel, percent, TrendChart } from "@/components/admin/charts";
import { AttentionList } from "@/components/admin/attention-list";
import { money } from "@/components/admin/format";
import type { Attention } from "@/server/admin/attention";
import { dayLabel, type Period } from "./period";
import type { MarketingData, OrdersData, WebData } from "./types";

type Props = {
  period: Period;
  orders: OrdersData;
  ordersBefore: OrdersData;
  web: WebData;
  webBefore: WebData;
  marketing: MarketingData;
  attention: Attention;
};

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** The week (or any period) at a glance. */
export function Overview({
  period,
  orders,
  ordersBefore,
  web,
  webBefore,
  marketing,
  attention,
}: Props) {
  const t = orders.totals;
  const b = ordersBefore.totals;
  const average = ratio(t.sales_cents, t.orders);
  const averageBefore = ratio(b.sales_cents, b.orders);
  const repeat = ratio(t.customers - t.new_customers, t.customers);
  const repeatBefore = ratio(b.customers - b.new_customers, b.customers);

  return (
    <div className="flex flex-col gap-6">
      <AttentionList items={attention} />

      <KpiGrid>
        <Kpi
          label="Sales"
          value={money(t.sales_cents)}
          now={t.sales_cents}
          before={b.sales_cents}
          help="Orders not cancelled, delivery fees included."
        />
        <Kpi label="Orders" value={String(t.orders)} now={t.orders} before={b.orders} />
        <Kpi
          label="Average order"
          value={money(Math.round(average))}
          now={average}
          before={averageBefore}
        />
        <Kpi
          label="Visits that ordered"
          value={percent(web.totals.orders, web.totals.visits, 1)}
          now={ratio(web.totals.orders, web.totals.visits)}
          before={ratio(webBefore.totals.orders, webBefore.totals.visits)}
        />
        <Kpi
          label="New customers"
          value={String(t.new_customers)}
          now={t.new_customers}
          before={b.new_customers}
        />
        <Kpi
          label="Came back"
          value={percent(t.customers - t.new_customers, t.customers)}
          now={repeat}
          before={repeatBefore}
          help="Customers in the period who had ordered before."
        />
      </KpiGrid>

      <Panel title="Sales by day">
        <TrendChart
          labels={orders.daily.map((d) => dayLabel(d.day))}
          format={(n) => money(Math.round(n))}
          series={[
            { name: period.label, values: orders.daily.map((d) => d.sales_cents) },
            {
              name: "Before",
              values: ordersBefore.daily.map((d) => d.sales_cents),
              tone: "muted",
              dashed: true,
            },
          ]}
        />
      </Panel>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="Best sellers">
          <Bars
            rows={orders.items.slice(0, 8).map((i) => ({
              name: i.name,
              value: i.quantity,
              detail: money(i.sales_cents),
            }))}
          />
        </Panel>
        <Panel
          title="Where orders come from"
          help="Each order goes to the visit that brought it: the last ad tap in the 30 days before, otherwise the last visit that wasn’t direct."
        >
          <Bars
            rows={marketing.channels.map((c) => ({
              name: c.name,
              value: c.orders,
              detail: money(c.sales_cents),
            }))}
            empty="No orders with tracked visits yet."
          />
        </Panel>
      </div>

      <section className="card border-dashed p-5 text-muted">
        <h2 className="text-base font-bold text-ink">The shop and online together</h2>
        <p className="mt-1">
          In-store sales, stock and costs arrive once the shop’s Odoo is connected. Then this
          compares the counter with the website, and adds profit.
        </p>
      </section>
    </div>
  );
}
