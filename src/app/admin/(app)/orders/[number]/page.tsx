import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderLabel, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { orderSelect } from "../data";
import { OrderDetail, StatusPill } from "../order-detail";
import { RefreshingActions } from "./refreshing-actions";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: /^\d+$/.test(number) ? orderLabel(Number(number)) : "Order" };
}

export default async function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireStaff();
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
          <Link href="/admin/orders/all" className="btn btn-secondary">
            All orders
          </Link>
        }
      />
      <div className="card p-5">
        <OrderDetail order={order} />
        <div className="mt-2">
          <RefreshingActions order={order} />
        </div>
      </div>
    </div>
  );
}
