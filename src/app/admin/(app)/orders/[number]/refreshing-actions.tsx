"use client";

import { useRouter } from "next/navigation";
import type { Order } from "../data";
import { OrderActions } from "../order-detail";

/** Cancelling on the order's own page, which reloads after it. */
export function RefreshingActions({ order }: { order: Order }) {
  const router = useRouter();
  if (order.status === "cancelled") return null;
  return <OrderActions order={order} onCancelled={() => router.refresh()} />;
}
