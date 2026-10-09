import Link from "next/link";
import { daysAgo, money, orderLabel, when } from "@/components/admin/format";
import type { adminClient } from "@/lib/supabase/server";
import { eventLabel, problemTitle } from "./labels";
import { visitHref } from "./problems";

type Db = Awaited<ReturnType<typeof adminClient>>;

const seconds = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Beirut",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const deviceNames: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
};
const problemEvents = new Set([
  "client_error",
  "not_found",
  "place_order_failed",
  "promo_rejected",
]);

/** The event's own details, as "key: value" pairs. */
function paramText(params: unknown) {
  if (!params || typeof params !== "object") return "";
  return Object.entries(params as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${String(v)}`)
    .join(" · ")
    .slice(0, 300);
}

function VisitPicker() {
  return (
    <form action="/admin/health" className="card flex flex-wrap items-end gap-3 p-5">
      <input type="hidden" name="tab" value="visit" />
      <label className="min-w-0 flex-1">
        <span className="mb-1 block text-[13px] font-semibold">Visit id</span>
        <input name="visit" required maxLength={64} className="field" autoComplete="off" />
      </label>
      <button className="btn btn-primary">Show</button>
    </form>
  );
}

/** Everything one visit did, in order: what led up to a problem. */
export async function VisitTab({ db, visit }: { db: Db; visit: string | null }) {
  if (!visit) return <VisitPicker />;

  const { data: events } = await db
    .from("analytics_events")
    .select(
      "id, occurred_at, event_name, visitor_id, locale, path, referrer, utm_source, utm_medium, utm_campaign, utm_content, gclid, fbclid, item_id, order_id, value_cents, device_type, browser, os, country, city, bot, bot_reason, internal, params",
    )
    .eq("visit_id", visit)
    .order("occurred_at")
    .limit(300);

  if (!events?.length)
    return (
      <div className="flex flex-col gap-4">
        <p className="card p-5">Nothing recorded for that visit.</p>
        <VisitPicker />
      </div>
    );

  const first = events[0];
  const last = events[events.length - 1];
  const orderIds = [...new Set(events.flatMap((e) => (e.order_id ? [e.order_id] : [])))];
  const itemIds = [...new Set(events.flatMap((e) => (e.item_id ? [e.item_id] : [])))];
  const [orders, items, others] = await Promise.all([
    orderIds.length
      ? db.from("orders").select("id, number, total_cents, status").in("id", orderIds)
      : null,
    itemIds.length ? db.from("products").select("slug, name_en").in("slug", itemIds) : null,
    first.visitor_id
      ? db
          .from("analytics_events")
          .select("visit_id, occurred_at")
          .eq("visitor_id", first.visitor_id)
          .neq("visit_id", visit)
          .gte("occurred_at", daysAgo(60))
          .order("occurred_at", { ascending: false })
          .limit(500)
      : null,
  ]);
  const orderById = new Map((orders?.data ?? []).map((o) => [o.id, o]));
  const itemName = new Map((items?.data ?? []).map((p) => [p.slug, p.name_en]));
  const otherVisits = [
    ...new Map((others?.data ?? []).map((e) => [e.visit_id!, e.occurred_at])).entries(),
  ].slice(0, 10);

  const tagged = events.find((e) => e.utm_source || e.gclid || e.fbclid || e.referrer);
  const cameFrom = tagged
    ? tagged.utm_source
      ? [tagged.utm_source, tagged.utm_medium, tagged.utm_campaign, tagged.utm_content]
          .filter(Boolean)
          .join(" / ")
      : tagged.gclid
        ? "Google Ads (click id)"
        : tagged.fbclid
          ? "A Facebook or Instagram link"
          : (tagged.referrer ?? "")
    : "Direct (no link or referrer)";
  const minutes = Math.round(
    (new Date(last.occurred_at).getTime() - new Date(first.occurred_at).getTime()) / 60_000,
  );

  const facts: [string, string][] = [
    ["Started", `${when(first.occurred_at)}, ${minutes} min, ${events.length} events`],
    [
      "Device",
      [deviceNames[first.device_type ?? ""], first.browser, first.os].filter(Boolean).join(" · ") ||
        "Not known",
    ],
    ["Where", [first.city, first.country].filter(Boolean).join(", ") || "Not known"],
    ["Language", first.locale === "ar" ? "Arabic" : first.locale === "en" ? "English" : "—"],
    ["Came from", cameFrom],
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">Visit {visit.slice(0, 8)}</h2>
          {first.bot && (
            <span className="pill bg-wait-soft text-wait">Robot: {first.bot_reason}</span>
          )}
          {first.internal && <span className="pill">Staff browsing</span>}
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {orderIds.length > 0 && (
          <p className="mt-3 text-[13px]">
            Ordered:{" "}
            {orderIds.map((id) => {
              const o = orderById.get(id);
              return o ? (
                <Link
                  key={id}
                  href={`/admin/orders/${o.number}`}
                  className="me-3 font-semibold text-accent"
                >
                  {orderLabel(o.number)} ({money(o.total_cents)})
                </Link>
              ) : null;
            })}
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-base font-bold">What happened</h2>
        <ol className="-mx-5 mt-3 divide-y divide-line text-[13px]">
          {events.map((e) => {
            const problem = problemEvents.has(e.event_name);
            const params = (e.params ?? {}) as Record<string, unknown>;
            const detail =
              e.event_name === "client_error"
                ? String(params.message ?? "")
                : e.event_name === "not_found"
                  ? String(params.requested ?? e.path ?? "")
                  : String(params.reason ?? "");
            return (
              <li key={e.id} className="flex flex-wrap gap-x-4 gap-y-0.5 px-5 py-2">
                <span className="w-20 flex-none text-muted tabular-nums">
                  {seconds.format(new Date(e.occurred_at))}
                </span>
                <span className="min-w-0 flex-[1_1_14rem]">
                  <span className={`font-semibold ${problem ? "text-bad" : ""}`}>
                    {problem ? problemTitle(e.event_name, detail) : eventLabel(e.event_name)}
                  </span>
                  {e.item_id && <span> · {itemName.get(e.item_id) ?? e.item_id}</span>}
                  {e.value_cents != null && <span> · {money(e.value_cents)}</span>}
                  <span className="block break-words text-muted">
                    {[e.path, problem ? "" : paramText(params)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {otherVisits.length > 0 && (
        <section className="card p-5">
          <h2 className="text-base font-bold">Same browser, other visits</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13px]">
            {otherVisits.map(([id, at]) => (
              <li key={id}>
                <Link href={visitHref(id)} className="text-accent">
                  {when(at)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
