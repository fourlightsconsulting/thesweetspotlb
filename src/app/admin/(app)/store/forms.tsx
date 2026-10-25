"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Help } from "@/components/admin/help";
import { retryAlerts } from "./actions";
import type { ClosureDraft, DayHours, HoursDraft, StoreDraft } from "./store-settings";
export type { DayHours } from "./store-settings";

const days = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
] as const;
function Card({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">
        {title}
        {help && <Help>{help}</Help>}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function HoursForm({
  value,
  onChange,
}: {
  value: HoursDraft;
  onChange: (value: HoursDraft) => void;
}) {
  const change = (weekday: number, patch: Partial<DayHours>) =>
    onChange({
      ...value,
      week: value.week.map((day, i) => (i === weekday ? { ...day, ...patch } : day)),
    });
  return (
    <Card
      title={`${value.branchName} opening hours`}
      help="A closing time at or before opening means after midnight. Changes apply when you save the Store page."
    >
      <div className="divide-y divide-line">
        {days.map(([weekday, name]) => {
          const day = value.week[weekday];
          return (
            <div key={weekday} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
              <label className="flex w-28 items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={day.open}
                  onChange={(e) => change(weekday, { open: e.target.checked })}
                  className="size-4 accent-accent"
                />
                {name}
              </label>
              {day.open ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.opens}
                    onChange={(e) => change(weekday, { opens: e.target.value })}
                    aria-label={`${value.branchName} ${name} opens`}
                    required
                    className="field w-[8.5rem]"
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time"
                    value={day.closes}
                    onChange={(e) => change(weekday, { closes: e.target.value })}
                    aria-label={`${value.branchName} ${name} closes`}
                    required
                    className="field w-[8.5rem]"
                  />
                </div>
              ) : (
                <span className="text-muted">Closed</span>
              )}
              {day.open && day.closes <= day.opens && (
                <span className="text-[12px] text-muted">closes the next morning</span>
              )}
            </div>
          );
        })}
      </div>
      <label className="mt-4 block">
        <span className="label">Last online orders</span>
        <span className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={180}
            required
            value={value.lastOrderMinutes}
            onChange={(e) => onChange({ ...value, lastOrderMinutes: e.target.value })}
            className="field w-24"
          />
          <span className="text-muted">minutes before closing</span>
        </span>
      </label>
    </Card>
  );
}

export function ClosuresCard({
  closures,
  branches,
  today,
  onChange,
  onRemove,
}: {
  closures: ClosureDraft[];
  branches: { id: string; name: string }[];
  today: string;
  onChange: (value: ClosureDraft[]) => void;
  onRemove: (id: string) => void;
}) {
  const change = (id: string, patch: Partial<ClosureDraft>) =>
    onChange(closures.map((closure) => (closure.id === id ? { ...closure, ...patch } : closure)));
  return (
    <Card
      title="Closed days"
      help="Whole days when the branch takes no orders. Additions and removals apply when you save the Store page."
    >
      {closures.length === 0 && <p className="text-muted">No closed days coming up.</p>}
      <div className="flex flex-col gap-3">
        {closures.map((closure) => (
          <div key={closure.id} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
            <label>
              <span className="label">Branch</span>
              <select
                value={closure.branchId}
                onChange={(e) => change(closure.id, { branchId: e.target.value })}
                className="field"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Date</span>
              <input
                type="date"
                min={today}
                required
                value={closure.date}
                onChange={(e) => change(closure.id, { date: e.target.value })}
                className="field"
              />
            </label>
            <label>
              <span className="label">Note for the team</span>
              <input
                value={closure.note}
                maxLength={80}
                onChange={(e) => change(closure.id, { note: e.target.value })}
                className="field"
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost text-bad"
              aria-label={`Remove closed day ${closure.date}`}
              onClick={() => onRemove(closure.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary mt-4"
        onClick={() =>
          onChange([
            ...closures,
            { id: crypto.randomUUID(), branchId: branches[0].id, date: today, note: "" },
          ])
        }
      >
        Add closed day
      </button>
    </Card>
  );
}

export function TimesForm({
  value,
  onChange,
}: {
  value: StoreDraft;
  onChange: (patch: Partial<StoreDraft>) => void;
}) {
  const range = (
    label: string,
    from: "pickupMin" | "deliveryMin",
    to: "pickupMax" | "deliveryMax",
  ) => (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={240}
          required
          value={value[from]}
          aria-label={`${label}: from`}
          onChange={(e) => onChange({ [from]: e.target.value })}
          className="field w-20"
        />
        <span className="text-muted">to</span>
        <input
          type="number"
          min={1}
          max={240}
          required
          value={value[to]}
          aria-label={`${label}: to`}
          onChange={(e) => onChange({ [to]: e.target.value })}
          className="field w-20"
        />
        <span className="text-muted">min</span>
      </div>
    </fieldset>
  );
  return (
    <Card title="Ready times" help="The preparation and delivery time ranges shown to customers.">
      <div className="flex flex-wrap gap-6">
        {range("Pickup", "pickupMin", "pickupMax")}
        {range("Delivery", "deliveryMin", "deliveryMax")}
      </div>
    </Card>
  );
}

export type AlertRow = {
  id: string;
  order: string;
  recipient: string;
  status: "queued" | "sending" | "sent" | "failed";
  at: string;
  error: string | null;
};
const alertTone = {
  queued: "bg-wait-soft text-wait",
  sending: "bg-wait-soft text-wait",
  sent: "bg-accent-soft text-accent",
  failed: "bg-bad-soft text-bad",
} as const;
export function AlertsForm({
  value,
  recent,
  onChange,
}: {
  value: NonNullable<StoreDraft["alerts"]>;
  recent: AlertRow[];
  onChange: (value: NonNullable<StoreDraft["alerts"]>) => void;
}) {
  const [retrying, startRetry] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <Card
      title="New-order alerts"
      help="Each number gets a WhatsApp message when a new order arrives."
    >
      <label className="mb-3 flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="size-4 accent-accent"
        />
        Send alerts
      </label>
      <label className="block">
        <span className="label">Phone numbers (one per line, up to 5)</span>
        <textarea
          rows={3}
          value={value.phones}
          onChange={(e) => onChange({ ...value, phones: e.target.value })}
          className="field max-w-sm font-mono"
        />
      </label>
      {recent.length > 0 && (
        <div className="mt-4">
          <p className="label">Latest alerts</p>
          <ul className="divide-y divide-line text-[13px]">
            {recent.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
                <span className="font-semibold">{alert.order}</span>
                <span className="text-muted">to {alert.recipient}</span>
                <span className={`pill ${alertTone[alert.status]}`}>{alert.status}</span>
                <span className="ms-auto text-muted">{alert.at}</span>
                {alert.error && <span className="w-full text-bad">{alert.error}</span>}
              </li>
            ))}
          </ul>
          {recent.some((alert) => alert.status === "queued" || alert.status === "failed") && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={retrying}
                className="btn btn-secondary btn-sm"
                onClick={() => startRetry(async () => setMessage((await retryAlerts()).message))}
              >
                {retrying ? "Sending…" : "Send waiting alerts"}
              </button>
              {message && <span className="text-[13px] text-muted">{message}</span>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
