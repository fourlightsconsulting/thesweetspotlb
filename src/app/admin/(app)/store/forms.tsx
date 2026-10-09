"use client";

import { useActionState, useState, useTransition } from "react";
import { FormCard, FormStatus, idle, useSubmit } from "@/components/admin/form";
import { Help } from "@/components/admin/help";
import { dateOf } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import {
  addClosure,
  moveZone,
  removeClosure,
  removeZone,
  retryAlerts,
  saveAlerts,
  saveHours,
  saveTimes,
  saveZone,
} from "./actions";

const days = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
] as const;

export type DayHours = { open: boolean; opens: string; closes: string };

/** A branch's opening hours, Monday first. Closing at or before opening runs past midnight. */
export function HoursForm({
  branchId,
  branchName,
  week,
  lastOrderMinutes,
}: {
  branchId: string;
  branchName: string;
  /** Indexed by weekday, 0 = Sunday. */
  week: DayHours[];
  lastOrderMinutes: number;
}) {
  const [state, action, pending] = useActionState(saveHours, idle);
  const [rows, setRows] = useState(week);
  const change = (weekday: number, patch: Partial<DayHours>) =>
    setRows((list) => list.map((d, i) => (i === weekday ? { ...d, ...patch } : d)));

  return (
    <FormCard
      title={`${branchName} opening hours`}
      help="A closing time at or before the opening time means after midnight: 12:00 pm to 12:00 am is noon to midnight."
      action={action}
      pending={pending}
      state={state}
    >
      <input type="hidden" name="branchId" value={branchId} />
      <div className="flex flex-col divide-y divide-line">
        {days.map(([weekday, name]) => {
          const day = rows[weekday];
          const overnight = day.open && day.closes <= day.opens;
          return (
            <div
              key={weekday}
              className="grid grid-cols-[7.5rem_1fr] items-center gap-x-3 gap-y-2 py-2 sm:grid-cols-[7.5rem_auto_1fr]"
            >
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  name={`open-${weekday}`}
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
                    name={`opens-${weekday}`}
                    value={day.opens}
                    onChange={(e) => change(weekday, { opens: e.target.value })}
                    aria-label={`${name} opens`}
                    required
                    className="field w-[8.5rem]"
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time"
                    name={`closes-${weekday}`}
                    value={day.closes}
                    onChange={(e) => change(weekday, { closes: e.target.value })}
                    aria-label={`${name} closes`}
                    required
                    className="field w-[8.5rem]"
                  />
                </div>
              ) : (
                <span className="text-muted">Closed</span>
              )}
              {overnight && (
                <span className="col-start-2 text-[12px] text-muted sm:col-start-3">
                  closes the next morning
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 max-w-xs">
        <label htmlFor={`last-${branchId}`} className="label">
          Last online orders
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`last-${branchId}`}
            name="lastOrderMinutes"
            type="number"
            min={0}
            max={180}
            defaultValue={lastOrderMinutes}
            className="field w-24"
          />
          <span className="text-muted">minutes before closing</span>
        </div>
      </div>
    </FormCard>
  );
}

export type Closure = { id: string; branchName: string; date: string; note: string };

/** Whole days off (holidays, private events): no online orders, shown as closed. */
export function ClosuresCard({
  closures,
  branches,
}: {
  closures: Closure[];
  branches: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(addClosure, idle);
  const submit = useSubmit(action);
  const [removing, startRemoving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">Closed days</h2>
      {closures.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-semibold">{dateOf(`${c.date}T12:00:00Z`)}</span>
                <span className="text-muted">
                  {" "}
                  · {c.branchName}
                  {c.note && ` · ${c.note}`}
                </span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() =>
                  startRemoving(async () => setError((await removeClosure(c.id)).error))
                }
                className="btn btn-ghost btn-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-muted">No closed days coming up.</p>
      )}
      {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}

      <form
        onSubmit={submit}
        className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
      >
        <div>
          <label htmlFor="closure-branch" className="label">
            Branch
          </label>
          <select id="closure-branch" name="branchId" className="field">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="closure-date" className="label">
            Date
          </label>
          <input id="closure-date" name="date" type="date" required className="field" />
        </div>
        <div>
          <label htmlFor="closure-note" className="label">
            Note <span className="font-normal text-muted">(for the team)</span>
          </label>
          <input
            id="closure-note"
            name="note"
            maxLength={80}
            placeholder="Eid al-Adha"
            className="field"
          />
        </div>
        <button className="btn btn-secondary" disabled={pending}>
          {pending ? "Adding…" : "Add closed day"}
        </button>
        <div className="sm:col-span-4">
          <FormStatus state={state} />
        </div>
      </form>
    </section>
  );
}

/** The ready-time ranges the website promises. */
export function TimesForm({
  branchId,
  pickup,
  delivery,
}: {
  branchId: string;
  pickup: [number, number];
  delivery: [number, number];
}) {
  const [state, action, pending] = useActionState(saveTimes, idle);
  const range = (label: string, prefix: string, [min, max]: [number, number]) => (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex items-center gap-2">
        <input
          name={`${prefix}Min`}
          type="number"
          min={1}
          max={240}
          defaultValue={min}
          aria-label={`${label}: from`}
          className="field w-20"
        />
        <span className="text-muted">to</span>
        <input
          name={`${prefix}Max`}
          type="number"
          min={1}
          max={240}
          defaultValue={max}
          aria-label={`${label}: to`}
          className="field w-20"
        />
        <span className="text-muted">min</span>
      </div>
    </fieldset>
  );

  return (
    <FormCard
      title="Ready times"
      help="What the website promises (“Ready in 10–15 min”), and when the Orders board marks an order late."
      action={action}
      pending={pending}
      state={state}
    >
      <input type="hidden" name="branchId" value={branchId} />
      <div className="flex flex-wrap gap-6">
        {range("Pickup", "pickup", pickup)}
        {range("Delivery", "delivery", delivery)}
      </div>
    </FormCard>
  );
}

export type Zone = {
  id: string;
  nameEn: string;
  nameAr: string;
  fee: number;
  active: boolean;
};

function ZoneRow({
  zone,
  branchId,
  first,
  last,
}: {
  zone: Zone;
  branchId: string;
  first: boolean;
  last: boolean;
}) {
  const [state, action, pending] = useActionState(saveZone, idle);
  const submit = useSubmit(action);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (task: () => Promise<{ error: string | null }>) =>
    startBusy(async () => setError((await task()).error));

  return (
    <li className="py-3">
      <form
        onSubmit={submit}
        className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_6.5rem_auto_auto] sm:items-center"
      >
        <input type="hidden" name="id" value={zone.id} />
        <input type="hidden" name="branchId" value={branchId} />
        <input
          name="nameEn"
          defaultValue={zone.nameEn}
          required
          maxLength={60}
          aria-label="Name in English"
          className="field"
        />
        <input
          name="nameAr"
          defaultValue={zone.nameAr}
          required
          maxLength={60}
          lang="ar"
          dir="rtl"
          aria-label="Name in Arabic"
          className="field"
        />
        <div className="relative">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            name="fee"
            type="number"
            min={0}
            step={0.25}
            defaultValue={(zone.fee / 100).toFixed(2)}
            aria-label="Delivery fee in dollars"
            className="field ps-6"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            name="active"
            defaultChecked={zone.active}
            className="size-4 accent-accent"
          />
          On
        </label>
        <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
          <button className="btn btn-secondary btn-sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            aria-label="Move up"
            disabled={first || busy}
            onClick={() => run(() => moveZone(zone.id, "up"))}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="up" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last || busy}
            onClick={() => run(() => moveZone(zone.id, "down"))}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="down" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${zone.nameEn}`}
            disabled={busy}
            onClick={() => {
              if (confirm(`Delete ${zone.nameEn}?`)) run(() => removeZone(zone.id));
            }}
            className="btn btn-ghost btn-sm px-1.5 text-bad"
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      </form>
      <div className="mt-1">
        <FormStatus state={state} />
        {error && <p className="text-[13px] text-bad">{error}</p>}
      </div>
    </li>
  );
}

/** Delivery areas and their fees, in the order checkout lists them. */
export function ZonesCard({ branchId, zones }: { branchId: string; zones: Zone[] }) {
  const [state, action, pending] = useActionState(saveZone, idle);
  const submit = useSubmit(action);
  const [formKey, setFormKey] = useState(0);
  const [lastAt, setLastAt] = useState(0);
  // A fresh empty form after each added area.
  if (state.status === "saved" && state.at !== lastAt) {
    setLastAt(state.at);
    setFormKey((k) => k + 1);
  }

  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">
        Delivery areas
        <Help>Checkout lists the areas that are on, in this order, each with its fee.</Help>
      </h2>
      <div className="mt-4 hidden grid-cols-[1fr_1fr_6.5rem_auto_auto] gap-2 text-[12px] font-semibold text-muted sm:grid">
        <span>English</span>
        <span>Arabic</span>
        <span>Fee</span>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {zones.map((zone, i) => (
          <ZoneRow
            key={`${zone.id}:${zone.nameEn}:${zone.fee}:${zone.active}`}
            zone={zone}
            branchId={branchId}
            first={i === 0}
            last={i === zones.length - 1}
          />
        ))}
      </ul>

      <form
        key={formKey}
        onSubmit={submit}
        className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_6.5rem_auto] sm:items-end"
      >
        <input type="hidden" name="branchId" value={branchId} />
        <div>
          <label htmlFor="zone-en" className="label">
            New area
          </label>
          <input
            id="zone-en"
            name="nameEn"
            required
            maxLength={60}
            placeholder="Mina"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="zone-ar" className="label">
            In Arabic
          </label>
          <input
            id="zone-ar"
            name="nameAr"
            required
            maxLength={60}
            lang="ar"
            dir="rtl"
            placeholder="الميناء"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="zone-fee" className="label">
            Fee ($)
          </label>
          <input
            id="zone-fee"
            name="fee"
            type="number"
            min={0}
            step={0.25}
            required
            placeholder="2.00"
            className="field"
          />
        </div>
        <button className="btn btn-secondary col-span-2 sm:col-span-1" disabled={pending}>
          <Icon name="plus" className="size-4" />
          {pending ? "Adding…" : "Add area"}
        </button>
      </form>
      <div className="mt-2">
        <FormStatus state={state} />
      </div>
    </section>
  );
}

/** The numbers that get a WhatsApp message for every new order. */
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
  enabled,
  phones,
  connected,
  recent,
}: {
  enabled: boolean;
  phones: string[];
  /** Whether the WhatsApp Cloud API settings are in place. */
  connected: boolean;
  recent: AlertRow[];
}) {
  const [state, action, pending] = useActionState(saveAlerts, idle);
  const [retrying, startRetry] = useTransition();
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const waiting = recent.some((a) => a.status === "queued" || a.status === "failed");

  return (
    <FormCard
      title="New-order alerts"
      help="Each number gets a WhatsApp message when an order comes in."
      action={action}
      pending={pending}
      state={state}
    >
      {!connected && (
        <p className="mb-3 rounded-[10px] bg-wait-soft px-3 py-2 text-[13px]">
          WhatsApp isn’t connected yet: alerts wait in a queue and go out once it is.
        </p>
      )}
      <label className="mb-3 flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={enabled}
          className="size-4 accent-accent"
        />
        Send alerts
      </label>
      <label htmlFor="alert-phones" className="label">
        Phone numbers <span className="font-normal text-muted">(one per line, up to 5)</span>
      </label>
      <textarea
        id="alert-phones"
        name="phones"
        rows={3}
        defaultValue={phones.join("\n")}
        placeholder="71 234 567"
        className="field max-w-sm font-mono"
      />

      {recent.length > 0 && (
        <div className="mt-4">
          <p className="label">Latest alerts</p>
          <ul className="flex flex-col divide-y divide-line text-[13px]">
            {recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
                <span className="font-semibold tabular-nums">{a.order}</span>
                <span className="text-muted">to {a.recipient}</span>
                <span className={`pill ${alertTone[a.status]}`}>{a.status}</span>
                <span className="ms-auto text-muted">{a.at}</span>
                {a.error && <span className="w-full text-bad">{a.error}</span>}
              </li>
            ))}
          </ul>
          {waiting && connected && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={retrying}
                onClick={() =>
                  startRetry(async () => setRetryMessage((await retryAlerts()).message))
                }
                className="btn btn-secondary btn-sm"
              >
                {retrying ? "Sending…" : "Send waiting alerts"}
              </button>
              {retryMessage && <span className="text-[13px] text-muted">{retryMessage}</span>}
            </div>
          )}
        </div>
      )}
    </FormCard>
  );
}
