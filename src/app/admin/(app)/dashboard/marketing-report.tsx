import Link from "next/link";
import {
  Bars,
  count,
  DataTable,
  Empty,
  Funnel,
  Kpi,
  KpiGrid,
  Panel,
  percent,
  TrendChart,
} from "@/components/admin/charts";
import { money } from "@/components/admin/format";
import { dayLabel, type Period } from "./period";
import type { MarketingData } from "./types";

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
const perOrder = (spend: number, orders: number) =>
  orders ? money(Math.round(spend / orders)) : "—";

function SocialCard({
  title,
  data,
}: {
  title: string;
  data: MarketingData["social"]["instagram"];
}) {
  if (!data) return null;
  const rows: [string, number | null][] = [
    ["Followers", data.followers],
    ["New followers", data.new_followers],
    ["Reach", data.reach],
    ["Views", data.views],
    ["Interactions", data.interactions],
    ["Profile visits", data.profile_views],
    ["Website taps", data.website_clicks],
  ];
  return (
    <Panel title={title} note="Includes activity from ads (Meta doesn’t split it)">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows
          .filter(([, v]) => v != null)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="text-lg font-bold tabular-nums">{count(value)}</dd>
            </div>
          ))}
      </dl>
      {data.daily.some((d) => d.reach) && (
        <div className="mt-4">
          <TrendChart
            labels={data.daily.map((d) => dayLabel(d.day))}
            series={[
              { name: "Reach", values: data.daily.map((d) => d.reach ?? 0) },
              {
                name: "Interactions",
                values: data.daily.map((d) => d.interactions ?? 0),
                tone: "wait",
              },
            ]}
          />
        </div>
      )}
    </Panel>
  );
}

/** Ads, sources, social and search: what marketing costs and what it brings. */
export function MarketingReport({
  period,
  data,
  before,
}: {
  period: Period;
  data: MarketingData;
  before: MarketingData;
}) {
  const adSpend = data.spend.meta_cents + data.spend.google_cents;
  const adSpendBefore = before.spend.meta_cents + before.spend.google_cents;
  const c = data.credit;
  const nothingConnected = data.spend.total_cents === 0 && data.campaigns.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {nothingConnected && (
        <p className="rounded-[12px] bg-wait-soft px-4 py-3 text-[13px]">
          No ad spend in this period. Spend arrives from Meta and Google once they’re connected, and
          by hand under{" "}
          <Link href="/admin/connections" className="font-semibold underline">
            Connections
          </Link>
          . Orders and sources below come from the website itself.
        </p>
      )}

      <KpiGrid>
        <Kpi
          label="Ad spend"
          value={money(adSpend)}
          now={adSpend}
          before={adSpendBefore}
          upIsGood={false}
          hint="Meta and Google"
        />
        <Kpi
          label="Orders from ads"
          value={count(c.ad_orders)}
          now={c.ad_orders}
          before={before.credit.ad_orders}
        />
        <Kpi
          label="Cost per order"
          value={perOrder(adSpend, c.ad_orders)}
          now={ratio(adSpend, c.ad_orders)}
          before={ratio(adSpendBefore, before.credit.ad_orders)}
          upIsGood={false}
        />
        <Kpi
          label="Sales from ads"
          value={money(c.ad_sales_cents)}
          now={c.ad_sales_cents}
          before={before.credit.ad_sales_cents}
        />
        <Kpi
          label="Back per $1"
          value={adSpend ? `$${(c.ad_food_cents / adSpend).toFixed(2)}` : "—"}
          now={ratio(c.ad_food_cents, adSpend)}
          before={ratio(before.credit.ad_food_cents, adSpendBefore)}
          hint="Food sold to ad visitors (no delivery fees) for each dollar of ad spend"
        />
        <Kpi
          label="All marketing"
          value={money(data.spend.total_cents)}
          hint="Ads plus spend entered by hand"
        />
      </KpiGrid>

      <Panel title="Spend and what ads brought in" note={period.label}>
        <TrendChart
          labels={data.daily.map((d) => dayLabel(d.day))}
          format={(n) => money(Math.round(n))}
          series={[
            { name: "Sales from ads", values: data.daily.map((d) => d.ad_sales_cents) },
            { name: "Spend", values: data.daily.map((d) => d.spend_cents), tone: "bad" },
          ]}
        />
      </Panel>

      <div className="grid gap-6 wide:grid-cols-[3fr_2fr]">
        <Panel
          title="From ad to order"
          note="The first three steps are Meta’s numbers; the rest are the website’s"
        >
          <Funnel
            steps={[
              { name: "Seen", value: data.meta.impressions },
              { name: "Tapped the link", value: data.meta.link_clicks },
              { name: "Page loaded", value: data.meta.landing_page_views },
              { name: "Visits from ads", value: data.funnel.paid_visits },
              { name: "Added to order", value: data.funnel.paid_carts },
              { name: "Went to checkout", value: data.funnel.paid_checkouts },
              { name: "Ordered", value: data.funnel.ad_orders },
              { name: "Completed", value: data.funnel.ad_completed },
            ]}
          />
        </Panel>
        <Panel
          title="Meta’s count and ours"
          note="Meta counts views and taps up to a week before; we count orders credited to an ad tap"
        >
          <DataTable
            head={["", "Meta", "Us"]}
            rows={[
              ["Purchases", count(data.meta.purchases), count(c.ad_orders)],
              ["Purchase value", money(data.meta.purchase_value_cents), money(c.ad_sales_cents)],
              ["WhatsApp chats started", count(data.meta.messaging_started), "—"],
              ["Instagram profile visits", count(data.meta.profile_visits), "—"],
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Campaigns"
        note="Our orders are matched by the campaign’s name in its links (utm_campaign)"
      >
        {data.campaigns.length === 0 ? (
          <Empty>No campaigns in this period.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="text-[12px] text-muted">
                <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:font-semibold [&>th:first-child]:text-start [&>th:not(:first-child)]:text-end">
                  <th>Campaign</th>
                  <th>Spend</th>
                  <th>Seen</th>
                  <th>Taps</th>
                  <th>Meta purchases</th>
                  <th>Our orders</th>
                  <th>Sales</th>
                  <th>Per order</th>
                </tr>
              </thead>
              {data.campaigns.map((campaign) => (
                <tbody key={`${campaign.platform}:${campaign.id}`} className="border-t border-line">
                  <tr className="[&>td]:px-5 [&>td]:py-2 [&>td:not(:first-child)]:text-end [&>td:not(:first-child)]:tabular-nums">
                    <td className="font-semibold">
                      {campaign.name || campaign.id}{" "}
                      <span className="pill">
                        {campaign.platform === "meta" ? "Meta" : "Google"}
                      </span>
                    </td>
                    <td>{money(campaign.spend_cents)}</td>
                    <td>{count(campaign.impressions)}</td>
                    <td>{count(campaign.link_clicks)}</td>
                    <td>{count(campaign.meta_purchases)}</td>
                    <td>{count(campaign.orders)}</td>
                    <td>{money(campaign.sales_cents)}</td>
                    <td>{perOrder(campaign.spend_cents, campaign.orders)}</td>
                  </tr>
                  {campaign.ads.map((ad) => (
                    <tr
                      key={ad.id}
                      className="text-muted [&>td]:px-5 [&>td]:py-1.5 [&>td:not(:first-child)]:text-end [&>td:not(:first-child)]:tabular-nums"
                    >
                      <td
                        className="max-w-[18rem] truncate ps-9"
                        title={`${ad.adset} › ${ad.name}`}
                      >
                        {ad.name}
                      </td>
                      <td>{money(ad.spend_cents)}</td>
                      <td>{count(ad.impressions)}</td>
                      <td>{count(ad.link_clicks)}</td>
                      <td>{count(ad.meta_purchases)}</td>
                      <td>{count(ad.orders)}</td>
                      <td />
                      <td>{perOrder(ad.spend_cents, ad.orders)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel
          title="Where orders come from"
          note="Each order’s credited visit, and that channel’s visits"
        >
          <DataTable
            head={["Channel", "Visits", "Orders", "Sales", "Visits that ordered"]}
            rows={data.channels.map((ch) => [
              ch.name,
              count(ch.visits),
              count(ch.orders),
              money(ch.sales_cents),
              percent(ch.orders, ch.visits, 1),
            ])}
            empty="No orders with tracked visits yet."
          />
        </Panel>
        <Panel
          title="Campaigns in links"
          note="Orders by the campaign tag on the visit credited (any source)"
        >
          <DataTable
            head={["Campaign", "Source", "Orders", "Sales"]}
            rows={data.campaigns_credit.map((ca) => [
              ca.name,
              ca.source,
              count(ca.orders),
              money(ca.sales_cents),
            ])}
            empty="No tagged visits led to orders."
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-3">
        <Panel title="Placements" note="Meta spend by where the ad showed">
          <Bars
            rows={data.placements.map((p) => ({
              name: p.name,
              value: p.spend_cents,
              detail: `${count(p.link_clicks)} taps`,
            }))}
            format={(n) => money(n)}
            empty="No Meta ads in this period."
          />
        </Panel>
        <Panel title="Codes">
          <DataTable
            head={["Code", "Orders", "Off", "Sales"]}
            rows={data.codes.map((co) => [
              co.name,
              count(co.orders),
              money(co.discount_cents),
              money(co.sales_cents),
            ])}
            empty="No codes used."
          />
        </Panel>
        <Panel title="Other spend" note="Entered by hand under Connections">
          <Bars
            rows={data.manual.map((m) => ({ name: m.name, value: m.spend_cents }))}
            format={(n) => money(n)}
            empty="Nothing entered."
          />
        </Panel>
      </div>

      <div className="grid gap-6 wide:grid-cols-2">
        <SocialCard title="Instagram" data={data.social.instagram} />
        <SocialCard title="Facebook page" data={data.social.facebook} />
      </div>
      {!data.social.instagram && !data.social.facebook && (
        <p className="text-[13px] text-muted">
          Instagram and Facebook numbers show once Meta is connected.
        </p>
      )}

      <Panel
        title="Google search"
        note={
          data.search.impressions
            ? `${count(data.search.clicks)} clicks from ${count(data.search.impressions)} appearances (${percent(data.search.clicks, data.search.impressions, 1)}), average position ${data.search.position?.toFixed(1) ?? "—"}`
            : "Shows once Search Console is connected."
        }
      >
        <div className="grid gap-6 wide:grid-cols-2">
          <DataTable
            head={["Searched for", "Clicks", "Seen", "Position"]}
            rows={data.search.queries.map((q) => [
              q.name,
              count(q.clicks),
              count(q.impressions),
              q.position?.toFixed(1) ?? "—",
            ])}
            empty="No searches yet."
          />
          <DataTable
            head={["Page", "Clicks", "Seen"]}
            rows={data.search.pages.map((p) => [
              p.name.replace(/^https?:\/\/[^/]+/, ""),
              count(p.clicks),
              count(p.impressions),
            ])}
            empty="No pages yet."
          />
        </div>
      </Panel>
    </div>
  );
}
