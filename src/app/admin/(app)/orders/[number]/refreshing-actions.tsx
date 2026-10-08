"use client";

import { useRouter } from "next/navigation";
import type { Order } from "../data";
import { OrderActions } from "../order-detail";

/** The order's buttons on its own page, which reloads after each move. */
export function RefreshingActions({ order }: { order: Order }) {
  const router = useRouter();
  return <OrderActions key={order.status} order={order} onMoved={() => router.refresh()} />;
}
