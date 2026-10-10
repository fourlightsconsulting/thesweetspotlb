import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderLabel, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { atLeast, requireStaff } from "@/server/admin/session";
import { orderSelect } from "../data";
import { OrderDetail, StatusPill } from "../order-detail";
import { RefreshingActions } from "./refreshing-actions";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: /^\d+$/.test(number) ? orderLabel(Number(number)) : "Order" };
}

type Source = {
  channel: string;
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  rule: "ad" | "last_non_direct" | "direct";
};

export default async function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  const staff = await requireStaff();
  const { number } = await params;
  if (!/^\d{1,12}$/.test(number)) notFound();

  const db = await adminClient();
  const { data: order } = await db
    .from("orders")
    .select(orderSelect)
    .eq("number", Number(number))
    .order("position", { referencedTable: "order_items" })
    .maybeSingle();
  if (!order) notFound();
  // Where it came from: the visit credited with it (managers).
  const source = atLeast(staff.role, "manager")
    ? ((await db.rpc("order_source", { p_order: order.id })).data as Source | null)
    : null;

  return (
    <div className="max-w-[640px]">
      <PageHeader
        title={orderLabel(order.number)}
        description={
          <span className="inline-flex items-center gap-2">
            <StatusPill order={order} /> placed {when(order.placed_at)}
          </span>
        }
        actions={
          <Link href="/admin/orders" className="btn btn-secondary">
            All orders
          </Link>
        }
      />
      <div className="card p-5">
        <OrderDetail order={order} />
        {source && (
          <p className="border-t border-line pt-3 text-[13px]">
            <span className="font-semibold">Came from:</span> {source.channel}
            {source.rule !== "direct" && ` · ${source.source} / ${source.medium}`}
            {source.campaign && ` · ${source.campaign}`}
            {source.content && ` · ${source.content}`}
          </p>
        )}
        <div className="mt-2">
          <RefreshingActions order={order} />
        </div>
      </div>
    </div>
  );
}
