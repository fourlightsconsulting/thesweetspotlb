"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { money, orderLabel, phone, timeOf, when, whatsappLink } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { advanceOrder, cancelOrder } from "./actions";
import {
  cancelReasons,
  describeOptions,
  dueAt,
  nextStep,
  type Order,
  type OrderStatus,
  statusLabel,
} from "./data";

const paymentLabel = (order: Order) =>
  `${order.payment_method === "cash_on_delivery" ? "Cash on delivery" : "Pay at pickup"} · ${
    order.payment_status === "paid"
      ? "paid"
      : order.payment_status === "refunded"
        ? "refunded"
        : "not paid yet"
  }`;

/** The status as a coloured pill. */
export function StatusPill({ order }: { order: Order }) {
  const tone =
    order.status === "received"
      ? "bg-wait-soft text-wait"
      : order.status === "cancelled"
        ? "bg-bad-soft text-bad"
        : order.status === "completed"
          ? ""
          : "bg-accent-soft text-accent";
  return (
    <>
      <span className={`pill ${tone}`}>{statusLabel(order)}</span>
      {order.is_test && <span className="pill">Test order</span>}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-b-0">
      <h3 className="mb-2 text-[12px] font-semibold tracking-[0.04em] text-muted uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Everything about one order, for the drawer and the order page. */
export function OrderDetail({ order }: { order: Order }) {
  const shownTotal = order.quoted_total_cents;
  const steps: [string, string | null][] = [
    ["Placed", order.placed_at],
    ["Started", order.preparing_at],
    [order.fulfilment === "delivery" ? "Sent out" : "Ready", order.ready_at],
    [order.fulfilment === "delivery" ? "Delivered" : "Picked up", order.completed_at],
  ];

  return (
    <div>
      <Section title="Customer">
        <p className="font-semibold">{order.customer_name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a href={`tel:${order.customer_phone}`} className="btn btn-secondary btn-sm">
            <Icon name="phone" className="size-4" />
            {phone(order.customer_phone)}
          </a>
          <a
            href={whatsappLink(order.customer_phone)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            WhatsApp
          </a>
          <Link href={`/admin/customers/${order.customer_id}`} className="btn btn-ghost btn-sm">
            Their orders
          </Link>
        </div>
      </Section>

      <Section title={order.fulfilment === "delivery" ? "Delivery" : "Pickup"}>
        {order.fulfilment === "delivery" ? (
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold">{order.delivery_zone_name_en}</p>
            <p>{order.address_street}</p>
            {order.address_floor && <p>{order.address_floor}</p>}
            {order.delivery_note && <p className="text-muted">“{order.delivery_note}”</p>}
          </div>
        ) : (
          <p>The customer collects it from the Tripoli branch.</p>
        )}
        <p className="mt-2 text-[13px] text-muted">
          Promised in {order.eta_min_minutes}–{order.eta_max_minutes} min · due by{" "}
          {timeOf(dueAt(order))}
        </p>
      </Section>

      <Section title="Order">
        <ul className="flex flex-col gap-3">
          {order.order_items.map((line) => {
            const options = describeOptions(line.order_item_options);
            return (
              <li key={line.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {line.quantity}× {line.name_en}
                  </p>
                  {options && <p className="text-[13px] text-muted">{options}</p>}
                  {line.note && <p className="text-[13px] text-wait">“{line.note}”</p>}
                </div>
                <p className="tabular-nums">{money(line.line_total_cents)}</p>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{money(order.subtotal_cents)}</dd>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Code {order.discount_code}</dt>
              <dd className="tabular-nums">{money(-order.discount_cents)}</dd>
            </div>
          )}
          {order.fulfilment === "delivery" && (
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="tabular-nums">{money(order.delivery_fee_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between text-[15px] font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(order.total_cents)}</dd>
          </div>
          <p className="text-muted">{paymentLabel(order)}</p>
        </dl>
        {shownTotal !== null && shownTotal !== order.total_cents && (
          <p className="mt-3 rounded-[10px] bg-wait-soft px-3 py-2 text-[13px]">
            The customer was shown {money(shownTotal)} at checkout: prices changed while they
            ordered. Agree the total with them before starting.
          </p>
        )}
      </Section>

      <Section title="Progress">
        <ol className="flex flex-col gap-1 text-[13px]">
          {steps.map(([label, at]) => (
            <li key={label} className="flex justify-between">
              <span className={at ? "" : "text-muted"}>{label}</span>
              <span className="text-muted tabular-nums">{at ? when(at) : "—"}</span>
            </li>
          ))}
          {order.cancelled_at && (
            <li className="flex justify-between text-bad">
              <span>Cancelled{order.cancel_reason ? `: ${order.cancel_reason}` : ""}</span>
              <span className="tabular-nums">{when(order.cancelled_at)}</span>
            </li>
          )}
        </ol>
      </Section>
    </div>
  );
}

type ActionsProps = {
  order: Order;
  /** Called once the database accepted the move (the board updates at once). */
  onMoved?: (status: OrderStatus, reason?: string) => void;
};

/** The next-step button and cancelling, with a reason. */
export function OrderActions({ order, onMoved }: ActionsProps) {
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState(cancelReasons[0]);
  const [other, setOther] = useState("");
  const step = nextStep(order);
  if (!step) return null;

  const run = (action: () => Promise<{ error: string | null }>, then: () => void) => {
    setError(null);
    startSaving(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else then();
    });
  };

  const finalReason = reason === "other" ? other : reason;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-[10px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}
      {cancelling ? (
        <fieldset disabled={saving} className="flex flex-col gap-2">
          <legend className="label">Why is {orderLabel(order.number)} cancelled?</legend>
          {[...cancelReasons, "other"].map((r) => (
            <label key={r} className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="cancel-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-accent"
              />
              {r === "other" ? "Something else" : r}
            </label>
          ))}
          {reason === "other" && (
            <input
              autoFocus
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={200}
              placeholder="What happened?"
              aria-label="Reason"
              className="field"
            />
          )}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="btn btn-danger flex-1"
              disabled={!finalReason.trim()}
              onClick={() =>
                run(
                  () => cancelOrder(order.id, finalReason),
                  () => onMoved?.("cancelled", finalReason),
                )
              }
            >
              {saving ? "Cancelling…" : "Cancel the order"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCancelling(false)}>
              Keep it
            </button>
          </div>
        </fieldset>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            className="btn btn-primary min-h-11 flex-1 text-[15px]"
            onClick={() =>
              run(
                () => advanceOrder(order.id, step.to),
                () => onMoved?.(step.to),
              )
            }
          >
            {saving ? "Saving…" : step.label}
          </button>
          <button
            type="button"
            disabled={saving}
            className="btn btn-secondary min-h-11"
            onClick={() => setCancelling(true)}
          >
            Cancel…
          </button>
        </div>
      )}
    </div>
  );
}
