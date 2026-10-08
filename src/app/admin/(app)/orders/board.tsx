"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Drawer } from "@/components/admin/drawer";
import { ago, money, orderLabel, phone, startOfBeirutDay, timeOf } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { browserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { advanceOrder } from "./actions";
import {
  boardQuery,
  describeOptions,
  dueAt,
  nextStep,
  type Order,
  orderSelect,
  type OrderStatus,
} from "./data";
import { OrderActions, OrderDetail, StatusPill } from "./order-detail";
import { useChime } from "./use-chime";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

const columns = [
  { key: "new", title: "New", empty: "No new orders.", statuses: ["received"] },
  { key: "preparing", title: "Preparing", empty: "Nothing on the go.", statuses: ["preparing"] },
  {
    key: "ready",
    title: "Ready & on the way",
    empty: "Nothing waiting to go out.",
    statuses: ["ready", "out_for_delivery"],
  },
  { key: "done", title: "Done today", empty: "Nothing finished yet.", statuses: [] },
] as const satisfies { key: string; title: string; empty: string; statuses: OrderStatus[] }[];

type ColumnKey = (typeof columns)[number]["key"];

const columnOf = (order: Order): ColumnKey =>
  columns.find((c) => (c.statuses as readonly OrderStatus[]).includes(order.status))?.key ?? "done";

/** A New order waiting longer than this gets flagged. */
const WAITING_MINUTES = 5;
/** While orders wait in New, the chime repeats this often. */
const REPEAT_MS = 45_000;

// The time, ticking every 20 seconds, for "4 min" labels. Null on the server.
let nowValue = Date.now();
const subscribeNow = (onChange: () => void) => {
  nowValue = Date.now();
  const timer = setInterval(() => {
    nowValue = Date.now();
    onChange();
  }, 20_000);
  return () => clearInterval(timer);
};
const useNow = () =>
  useSyncExternalStore(
    subscribeNow,
    () => nowValue,
    () => null,
  );

/** Status changes from the database, onto an order we already have. */
const withChanges = (order: Order, row: Partial<OrderRow>): Order => ({
  ...order,
  status: row.status ?? order.status,
  payment_status: row.payment_status ?? order.payment_status,
  cancel_reason: row.cancel_reason ?? order.cancel_reason,
  preparing_at: row.preparing_at ?? order.preparing_at,
  ready_at: row.ready_at ?? order.ready_at,
  completed_at: row.completed_at ?? order.completed_at,
  cancelled_at: row.cancelled_at ?? order.cancelled_at,
});

/** The step's time stamp, set here at once; the database's own arrives with the update. */
const stamp = (status: OrderStatus): Partial<OrderRow> => {
  const at = new Date().toISOString();
  switch (status) {
    case "preparing":
      return { status, preparing_at: at };
    case "ready":
    case "out_for_delivery":
      return { status, ready_at: at };
    case "completed":
      return { status, completed_at: at, payment_status: "paid" };
    case "cancelled":
      return { status, cancelled_at: at };
    default:
      return { status };
  }
};

export function OrderBoard({ initial }: { initial: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<ColumnKey>("new");
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const chime = useChime();
  const now = useNow();

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
    const arrived = data.some((o) => o.status === "received" && !knownRef.current.has(o.id));
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
          setOrders((list) => (list.some((o) => o.id === data.id) ? list : [...list, data]));
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

  const waiting = orders.filter((o) => o.status === "received").length;

  // Keep ringing while orders wait to be started.
  useEffect(() => {
    if (waiting === 0 || !chime.wanted) return;
    const timer = setInterval(() => ringRef.current(), REPEAT_MS);
    return () => clearInterval(timer);
  }, [waiting, chime.wanted]);

  useEffect(() => {
    const previous = document.title;
    document.title = waiting > 0 ? `(${waiting}) New orders · Orders` : "Orders · Sweet Spot admin";
    return () => {
      document.title = previous;
    };
  }, [waiting]);

  const moved = (id: string, status: OrderStatus, reason?: string) =>
    setOrders((list) =>
      list.map((o) =>
        o.id === id
          ? withChanges(o, { ...stamp(status), ...(reason ? { cancel_reason: reason } : {}) })
          : o,
      ),
    );

  const byColumn = (key: ColumnKey) => {
    const list = orders.filter((o) => columnOf(o) === key);
    // The queue oldest first; finished orders newest first.
    return key === "done" ? list.reverse() : list;
  };
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
            {live === "live"
              ? "Live: new orders appear here by themselves."
              : live === "offline"
                ? "Reconnecting… the board refreshes every minute meanwhile."
                : "Connecting…"}
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

      {/* Phones and tablets: one column at a time. */}
      <div
        role="tablist"
        aria-label="Order columns"
        className="mb-4 grid grid-cols-4 gap-1 rounded-[12px] bg-tint p-1 wide:hidden"
      >
        {columns.map((c) => (
          <button
            key={c.key}
            role="tab"
            type="button"
            aria-selected={tab === c.key}
            onClick={() => setTab(c.key)}
            className="flex min-h-10 flex-col items-center justify-center rounded-[9px] px-1 text-[12px] leading-4 font-semibold text-muted aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm"
          >
            <span className="truncate">{c.key === "ready" ? "Ready" : c.title.split(" ")[0]}</span>
            <span className="tabular-nums">{byColumn(c.key).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 wide:grid-cols-3">
        {columns
          .filter((c) => c.key !== "done")
          .map((c) => (
            <section
              key={c.key}
              aria-label={c.title}
              className={`min-w-0 ${tab === c.key ? "" : "max-wide:hidden"}`}
            >
              <h2 className="mb-2 hidden items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-muted uppercase wide:flex">
                {c.title}
                <span className="pill">{byColumn(c.key).length}</span>
              </h2>
              <div className="flex flex-col gap-3">
                {byColumn(c.key).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    onOpen={() => setOpenId(order.id)}
                    onMoved={(status) => moved(order.id, status)}
                  />
                ))}
                {byColumn(c.key).length === 0 && (
                  <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-8 text-center text-muted">
                    {c.empty}
                  </p>
                )}
              </div>
            </section>
          ))}
      </div>

      <section
        aria-label="Done today"
        className={`mt-8 ${tab === "done" ? "" : "max-wide:hidden"}`}
      >
        <h2 className="mb-2 hidden items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-muted uppercase wide:flex">
          Done today <span className="pill">{byColumn("done").length}</span>
        </h2>
        {byColumn("done").length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-8 text-center text-muted">
            Nothing finished yet.
          </p>
        ) : (
          <ul className="card divide-y divide-line">
            {byColumn("done").map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(order.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-start hover:bg-tint"
                >
                  <span className="font-semibold tabular-nums">{orderLabel(order.number)}</span>
                  <span className="min-w-0 flex-1 truncate">{order.customer_name}</span>
                  <StatusPill order={order} />
                  <span className="text-muted tabular-nums">{money(order.total_cents)}</span>
                  <span className="text-muted tabular-nums">{timeOf(order.placed_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          nextStep(open) && (
            <OrderActions
              key={`${open.id}:${open.status}`}
              order={open}
              onMoved={(status, reason) => moved(open.id, status, reason)}
            />
          )
        }
      >
        {open && <OrderDetail order={open} />}
      </Drawer>
    </>
  );
}

type CardProps = {
  order: Order;
  now: number | null;
  onOpen: () => void;
  onMoved: (status: OrderStatus) => void;
};

function OrderCard({ order, now, onOpen, onMoved }: CardProps) {
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const step = nextStep(order);

  const waitedTooLong =
    now !== null &&
    order.status === "received" &&
    now - new Date(order.placed_at).getTime() > WAITING_MINUTES * 60_000;
  const late = now !== null && now > dueAt(order).getTime();

  return (
    <article
      className={`card relative flex flex-col gap-3 p-4 transition-colors hover:border-line-strong ${
        late ? "border-bad/50" : waitedTooLong ? "border-wait/60" : ""
      }`}
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
          {now !== null && (
            <span
              className={`text-[12px] font-semibold tabular-nums ${late ? "text-bad" : waitedTooLong ? "text-wait" : "text-muted"}`}
            >
              {late
                ? `Late · due ${timeOf(dueAt(order))}`
                : `${ago(order.placed_at, new Date(now))} ago`}
            </span>
          )}
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-[13px] text-muted">
          <span className="font-semibold text-ink tabular-nums">{money(order.total_cents)}</span> ·{" "}
          {order.payment_method === "cash_on_delivery" ? "cash on delivery" : "pay at pickup"}
        </span>
        {step && (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setError(null);
              startSaving(async () => {
                const result = await advanceOrder(order.id, step.to);
                if (result.error) setError(result.error);
                else onMoved(step.to);
              });
            }}
            className="btn btn-primary relative z-10"
          >
            {saving ? "Saving…" : step.label}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="relative z-10 text-[13px] text-bad">
          {error}
        </p>
      )}
    </article>
  );
}
