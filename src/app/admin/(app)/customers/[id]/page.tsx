import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dateOf, money, orderLabel, phone, when, whatsappLink } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { atLeast, requireStaff } from "@/server/admin/session";
import { statusLabel } from "../../orders/data";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const db = await adminClient();
  const [summary, orders, lines] = await Promise.all([
    db.from("customer_summaries").select("*").eq("id", id).maybeSingle(),
    db
      .from("orders")
      .select(
        "id, number, status, fulfilment, total_cents, placed_at, discount_code, delivery_zone_name_en, address_street, address_floor",
      )
      .eq("customer_id", id)
      .order("placed_at", { ascending: false })
      .limit(100),
    db
      .from("order_items")
      .select("name_en, quantity, orders!inner(customer_id, status)")
      .eq("orders.customer_id", id)
      .neq("orders.status", "cancelled"),
  ]);
  const c = summary.data;
  if (!c) notFound();

  // How they found us: the visit credited with their first order (managers).
  const firstOrder = (orders.data ?? []).filter((o) => o.status !== "cancelled").at(-1);
  const found =
    firstOrder && atLeast(staff.role, "manager")
      ? ((await db.rpc("order_source", { p_order: firstOrder.id })).data as {
          channel: string;
          source: string;
          campaign: string | null;
          rule: string;
        } | null)
      : null;

  // Favourites: the items they order most.
  const counts = new Map<string, number>();
  for (const line of lines.data ?? [])
    counts.set(line.name_en, (counts.get(line.name_en) ?? 0) + line.quantity);
  const favourites = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Where they've had orders delivered.
  const addresses = [
    ...new Set(
      (orders.data ?? [])
        .filter((o) => o.fulfilment === "delivery" && o.address_street)
        .map((o) =>
          [o.delivery_zone_name_en, o.address_street, o.address_floor].filter(Boolean).join(", "),
        ),
    ),
  ].slice(0, 5);

  const stats = [
    { label: "Orders", value: String(c.orders) },
    { label: "Spent", value: money(Number(c.spent_cents)) },
    {
      label: "Average order",
      value: c.orders ? money(Math.round(Number(c.spent_cents) / c.orders)) : "—",
    },
    {
      label: "Customer since",
      value: c.first_order_at ? dateOf(c.first_order_at) : dateOf(c.created_at!),
    },
  ];

  return (
    <>
      <PageHeader
        title={c.name || "No name"}
        description={
          <>
            {phone(c.phone ?? "")}
            {c.email && ` · ${c.email}`} · writes in{" "}
            {c.preferred_locale === "ar" ? "Arabic" : "English"}
            {c.marketing_opt_in_at && " · happy to get messages"}
          </>
        }
        actions={
          <>
            <a href={`tel:${c.phone}`} className="btn btn-secondary">
              <Icon name="phone" className="size-4" />
              Call
            </a>
            <a
              href={whatsappLink(c.phone ?? "")}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              WhatsApp
            </a>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 wide:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-[13px] text-muted">{s.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 wide:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-base font-bold">Orders</h2>
          {(orders.data ?? []).length === 0 ? (
            <p className="px-4 py-3 text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.data!.map((o) => (
                <li
                  key={o.id}
                  className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-tint"
                >
                  <Link
                    href={`/admin/orders/${o.number}`}
                    className="font-semibold tabular-nums after:absolute after:inset-0"
                  >
                    {orderLabel(o.number)}
                  </Link>
                  <span className="text-muted">{when(o.placed_at)}</span>
                  <span className="text-muted">
                    {o.fulfilment === "delivery" ? "Delivery" : "Pickup"}
                  </span>
                  {o.discount_code && <span className="pill">{o.discount_code}</span>}
                  <span
                    className={`pill ms-auto ${o.status === "cancelled" ? "bg-bad-soft text-bad" : ""}`}
                  >
                    {statusLabel(o)}
                  </span>
                  <span className="tabular-nums">{money(o.total_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="card p-4">
            <h2 className="mb-2 text-base font-bold">Favourites</h2>
            {favourites.length === 0 ? (
              <p className="text-muted">Nothing yet.</p>
            ) : (
              <ol className="flex flex-col gap-1">
                {favourites.map(([name, qty]) => (
                  <li key={name} className="flex justify-between gap-3">
                    <span>{name}</span>
                    <span className="text-muted tabular-nums">×{qty}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="card p-4">
            <h2 className="mb-2 text-base font-bold">Delivered to</h2>
            {addresses.length === 0 ? (
              <p className="text-muted">Picks up.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {addresses.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-4">
            <h2 className="mb-1 text-base font-bold">How they found us</h2>
            {found ? (
              <p>
                {found.channel}
                {found.rule !== "direct" && <span className="text-muted"> · {found.source}</span>}
                {found.campaign && <span className="text-muted"> · {found.campaign}</span>}
              </p>
            ) : (
              <p className="text-muted">Not known: their first order has no tracked visit.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
