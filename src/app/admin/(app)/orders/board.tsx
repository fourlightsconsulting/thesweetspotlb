"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/admin/drawer";
import { money, orderLabel, phone, startOfBeirutDay, timeOf } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { browserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { boardQuery, describeOptions, type Order, orderSelect } from "./data";
import { OrderActions, OrderDetail, StatusPill } from "./order-detail";
import { useChime } from "./use-chime";

// Today's orders as they come in, newest first. An order counts as completed
// once placed (the customer sends it on WhatsApp), so there are no steps to
// move it through; staff can only cancel one.

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

/** Changes from the database (a cancellation, a test flag) onto an order we already have. */
const withChanges = (order: Order, row: Partial<OrderRow>): Order => ({
  ...order,
  status: row.status ?? order.status,
  is_test: row.is_test ?? order.is_test,
  cancel_reason: row.cancel_reason ?? order.cancel_reason,
  cancelled_at: row.cancelled_at ?? order.cancelled_at,
});

export function OrderBoard({ initial }: { initial: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const chime = useChime();

  // The realtime and polling callbacks outlive renders: they read these.
  const ringRef = useRef(chime.ring);
  const knownRef = useRef(new Set(initial.map((o) => o.id)));
  useEffect(() => {
    ringRef.current = chime.ring;
    knownRef.current = new Set(orders.map((o) => o.id));
  });

  const refresh = useCallback(async () => {
    const { data, error } = await boardQuery(browserClient(), startOfBeirutDay());
    if (error || !data) return;
    const arrived = data.some((o) => !knownRef.current.has(o.id));
    setOrders(data);
    if (arrived) ringRef.current();
  }, []);

  useEffect(() => {
    const db = browserClient();
    let missedUpdates = false;
    const channel = db
      .channel("admin-order-board")
      .on<OrderRow>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async ({ new: row }) => {
          const { data } = await db.from("orders").select(orderSelect).eq("id", row.id).single();
          if (!data || knownRef.current.has(data.id)) return;
          setOrders((list) => (list.some((o) => o.id === data.id) ? list : [data, ...list]));
          ringRef.current();
        },
      )
      .on<OrderRow>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        ({ new: row }) => {
          setOrders((list) => list.map((o) => (o.id === row.id ? withChanges(o, row) : o)));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive("live");
          if (missedUpdates) void refresh();
          missedUpdates = false;
        } else {
          setLive("offline");
          missedUpdates = true;
        }
      });

    // A safety net for sleeping tablets and dropped connections.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(refresh, 60_000);
    return () => {
      void db.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(poll);
    };
  }, [refresh]);

  const cancelled = (id: string, reason: string) =>
    setOrders((list) =>
      list.map((o) =>
        o.id === id
          ? withChanges(o, {
              status: "cancelled",
              cancel_reason: reason,
              cancelled_at: new Date().toISOString(),
            })
          : o,
      ),
    );

  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          <span className="inline-flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${live === "live" ? "bg-good" : live === "offline" ? "bg-bad" : "bg-wait"}`}
            />
            {live === "live" ? "Live" : live === "offline" ? "Reconnecting…" : "Connecting…"}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={chime.wanted ? chime.turnOff : chime.turnOn}
              className={`btn ${chime.wanted ? "btn-secondary" : "btn-primary"}`}
            >
              <Icon name={chime.wanted ? "sound" : "soundOff"} className="size-4" />
              {chime.wanted ? "Sound on" : "Turn sound on"}
            </button>
            <Link href="/admin/orders/all" className="btn btn-secondary">
              All orders
            </Link>
          </>
        }
      />

      {chime.blocked && (
        <button
          type="button"
          onClick={chime.turnOn}
          className="mb-4 w-full rounded-[12px] bg-wait-soft px-4 py-3 text-start font-semibold"
        >
          Tap here so the new-order sound can play.
        </button>
      )}

      <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-muted uppercase">
        Today <span className="pill">{orders.length}</span>
      </h2>
      {orders.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-8 text-center text-muted">
          No orders yet today.
        </p>
      ) : (
        <div className="grid items-start gap-4 wide:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onOpen={() => setOpenId(order.id)} />
          ))}
        </div>
      )}

      <Drawer
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open ? orderLabel(open.number) : ""}
        subtitle={
          open && (
            <span className="inline-flex items-center gap-2">
              <StatusPill order={open} /> placed {timeOf(open.placed_at)}
            </span>
          )
        }
        footer={
          open &&
          open.status !== "cancelled" && (
            <OrderActions
              key={open.id}
              order={open}
              onCancelled={(reason) => cancelled(open.id, reason)}
            />
          )
        }
      >
        {open && <OrderDetail order={open} />}
      </Drawer>
    </>
  );
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const isCancelled = order.status === "cancelled";
  return (
    <article
      className={`card relative flex flex-col gap-3 p-4 transition-colors hover:border-line-strong ${isCancelled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="text-start text-[17px] leading-6 font-bold tabular-nums after:absolute after:inset-0 after:rounded-[14px]"
          >
            {orderLabel(order.number)}
          </button>
          {order.is_test && <span className="pill ms-2">Test</span>}
          {isCancelled && <span className="pill ms-2 bg-bad-soft text-bad">Cancelled</span>}
          <p className="truncate text-[13px] text-muted">
            {order.customer_name} · {phone(order.customer_phone)}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <span
            className={`pill ${order.fulfilment === "delivery" ? "bg-accent-soft text-accent" : ""}`}
          >
            {order.fulfilment === "delivery"
              ? `Delivery · ${order.delivery_zone_name_en}`
              : "Pickup"}
          </span>
          <span className="text-[12px] font-semibold text-muted tabular-nums">
            {timeOf(order.placed_at)}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {order.order_items.map((line) => {
          const options = describeOptions(line.order_item_options);
          return (
            <li key={line.id} className="leading-5">
              <span className="font-semibold">
                {line.quantity}× {line.name_en}
              </span>
              {options && <span className="block text-[13px] text-muted">{options}</span>}
              {line.note && <span className="block text-[13px] text-wait">“{line.note}”</span>}
            </li>
          );
        })}
      </ul>
      {order.delivery_note && (
        <p className="text-[13px] text-wait">Delivery note: “{order.delivery_note}”</p>
      )}

      <p className="border-t border-line pt-3 text-[13px] text-muted">
        <span className="font-semibold text-ink tabular-nums">{money(order.total_cents)}</span> ·{" "}
        {order.payment_method === "cash_on_delivery" ? "cash on delivery" : "pay at pickup"}
      </p>
    </article>
  );
}
