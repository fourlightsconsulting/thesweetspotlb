import type { Metadata } from "next";
import Link from "next/link";
import { money, orderLabel, phone, startOfBeirutDay, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";

export const metadata: Metadata = { title: "Orders" };

// Every order, newest first, searchable by number, phone or name and by
// dates. Orders count as completed once placed, so there's no status to
// show; cancelled and test orders are tagged.

const PAGE_SIZE = 50;

/** The list's columns, shared by the header and every row. */
const columns =
  "grid grid-cols-[minmax(120px,1fr)_150px_minmax(160px,2fr)_minmax(140px,1.5fr)_56px_80px] gap-4";

const dateParam = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

/** The next calendar day, for an inclusive "to" date. */
const dayAfter = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const from = dateParam(params.from);
  const to = dateParam(params.to);
  const page = Math.max(1, Number(params.page) || 1);

  const db = await adminClient();
  let query = db
    .from("orders")
    .select(
      "id, number, status, is_test, fulfilment, customer_name, customer_phone, delivery_zone_name_en, total_cents, placed_at, order_items(quantity)",
      { count: "exact" },
    )
    .order("placed_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    const number = q.match(/^(?:tss-?)?(\d{4,})$/i);
    const digits = q.replace(/\D/g, "");
    if (number) query = query.eq("number", Number(number[1]));
    else if (digits.length >= 3 && digits.length === q.replace(/[\s+()-]/g, "").length)
      query = query.like("customer_phone", `%${digits.replace(/^(00961|961|0)/, "")}%`);
    else query = query.ilike("customer_name", `%${q.replace(/[%_,()]/g, " ")}%`);
  }
  if (from) query = query.gte("placed_at", startOfBeirutDay(from));
  if (to) query = query.lt("placed_at", startOfBeirutDay(dayAfter(to)));

  const { data, count, error } = await query;
  if (error) throw new Error(`Loading the orders failed: ${error.message}`);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const pageLink = (n: number) => {
    const next = new URLSearchParams({ q, from, to, page: String(n) });
    for (const [key, value] of [...next]) if (!value) next.delete(key);
    return `/admin/orders?${next}`;
  };

  return (
    <>
      <PageHeader title="Orders" />

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 wide:grid-cols-[2fr_1fr_1fr_auto] wide:items-end">
        <div>
          <label htmlFor="q" className="label">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="TSS-1001, 71 234 567 or a name"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="from" className="label">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className="field" />
        </div>
        <div>
          <label htmlFor="to" className="label">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="field" />
        </div>
        <button className="btn btn-primary">Search</button>
      </form>

      <p className="mb-2 text-[13px] text-muted">
        {count === 0
          ? "No orders match."
          : `${count} order${count === 1 ? "" : "s"}${pages > 1 ? ` · page ${page} of ${pages}` : ""}`}
      </p>

      {data.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="min-w-[680px]">
            <div
              className={`${columns} border-b border-line px-4 py-2.5 text-[12px] font-semibold text-muted`}
            >
              <span>Order</span>
              <span>Placed</span>
              <span>Customer</span>
              <span>Type</span>
              <span className="text-end">Items</span>
              <span className="text-end">Total</span>
            </div>
            <ul className="divide-y divide-line">
              {data.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.number}`}
                    className={`${columns} items-start px-4 py-3 hover:bg-tint ${order.status === "cancelled" ? "text-muted" : ""}`}
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold tabular-nums">{orderLabel(order.number)}</span>
                      {order.status === "cancelled" && (
                        <span className="pill bg-bad-soft text-bad">Cancelled</span>
                      )}
                      {order.is_test && <span className="pill">Test</span>}
                    </span>
                    <span className="whitespace-nowrap text-muted tabular-nums">
                      {when(order.placed_at)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{order.customer_name}</span>
                      <span className="block text-[13px] text-muted">
                        {phone(order.customer_phone)}
                      </span>
                    </span>
                    <span className="text-muted">
                      {order.fulfilment === "delivery"
                        ? `Delivery · ${order.delivery_zone_name_en}`
                        : "Pickup"}
                    </span>
                    <span className="text-end tabular-nums">
                      {order.order_items.reduce((n, i) => n + i.quantity, 0)}
                    </span>
                    <span className="text-end tabular-nums">{money(order.total_cents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageLink(page - 1)} className="btn btn-secondary">
              Newer
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={pageLink(page + 1)} className="btn btn-secondary">
              Older
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
