import type { Metadata } from "next";
import Link from "next/link";
import { money, orderLabel, phone, startOfBeirutDay, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { type OrderStatus, statusLabel } from "../data";

export const metadata: Metadata = { title: "All orders" };

const PAGE_SIZE = 50;

const statusChoices: { value: string; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const dateParam = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

/** The next calendar day, for an inclusive "to" date. */
const dayAfter = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default async function AllOrdersPage({ searchParams }: PageProps<"/admin/orders/all">) {
  await requireStaff();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const status = statusChoices.some((s) => s.value === params.status) ? String(params.status) : "";
  const from = dateParam(params.from);
  const to = dateParam(params.to);
  const page = Math.max(1, Number(params.page) || 1);

  const db = await adminClient();
  let query = db
    .from("orders")
    .select(
      "id, number, status, fulfilment, customer_name, customer_phone, delivery_zone_name_en, total_cents, placed_at, order_items(quantity)",
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
  if (status) query = query.eq("status", status as OrderStatus);
  if (from) query = query.gte("placed_at", startOfBeirutDay(from));
  if (to) query = query.lt("placed_at", startOfBeirutDay(dayAfter(to)));

  const { data, count, error } = await query;
  if (error) throw new Error(`Loading the orders failed: ${error.message}`);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const pageLink = (n: number) => {
    const next = new URLSearchParams({ q, status, from, to, page: String(n) });
    for (const [key, value] of [...next]) if (!value) next.delete(key);
    return `/admin/orders/all?${next}`;
  };

  return (
    <>
      <PageHeader
        title="All orders"
        actions={
          <Link href="/admin/orders" className="btn btn-secondary">
            Back to the board
          </Link>
        }
      />

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 wide:grid-cols-[2fr_1fr_1fr_1fr_auto] wide:items-end">
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
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            {statusChoices.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
          <table className="w-full min-w-[640px] text-start">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-semibold">
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Type</th>
                <th className="text-end">Items</th>
                <th className="text-end">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((order) => (
                <tr
                  key={order.id}
                  className="relative hover:bg-tint [&>td]:px-4 [&>td]:py-3 [&>td]:align-top"
                >
                  <td className="font-semibold tabular-nums">
                    <Link
                      href={`/admin/orders/${order.number}`}
                      className="after:absolute after:inset-0"
                    >
                      {orderLabel(order.number)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-muted tabular-nums">
                    {when(order.placed_at)}
                  </td>
                  <td>
                    <span className="block">{order.customer_name}</span>
                    <span className="block text-[13px] text-muted">
                      {phone(order.customer_phone)}
                    </span>
                  </td>
                  <td className="text-muted">
                    {order.fulfilment === "delivery"
                      ? `Delivery · ${order.delivery_zone_name_en}`
                      : "Pickup"}
                  </td>
                  <td className="text-end tabular-nums">
                    {order.order_items.reduce((n, i) => n + i.quantity, 0)}
                  </td>
                  <td className="text-end tabular-nums">{money(order.total_cents)}</td>
                  <td>
                    <span
                      className={`pill ${order.status === "cancelled" ? "bg-bad-soft text-bad" : ""}`}
                    >
                      {statusLabel(order)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
