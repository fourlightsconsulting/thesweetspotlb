"use client";

import { useActionState, useState, useTransition } from "react";
import { FormStatus, idle, useSubmit } from "@/components/admin/form";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import { addSpend, removeSpend, runJob } from "./actions";

/** "Run now", and a date range for fetching the past. */
export function JobControls({ job, canBackfill }: { job: string; canBackfill: boolean }) {
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showRange, setShowRange] = useState(false);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const start = (range?: { since: string; until: string }) =>
    startBusy(async () => {
      const result = await runJob(job, range);
      setMessage(result.error ?? "Started. The result shows here in a minute or two.");
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => start()}
          className="btn btn-secondary btn-sm"
        >
          <Icon name="refresh" className="size-4" />
          {busy ? "Starting…" : "Run now"}
        </button>
        {canBackfill && (
          <button
            type="button"
            onClick={() => setShowRange((v) => !v)}
            className="btn btn-ghost btn-sm"
          >
            Fetch past dates
          </button>
        )}
      </div>
      {showRange && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[13px]">
            <span className="label">From</span>
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="field min-h-[34px] py-1"
            />
          </label>
          <label className="text-[13px]">
            <span className="label">To</span>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="field min-h-[34px] py-1"
            />
          </label>
          <button
            type="button"
            disabled={busy || !since || !until}
            onClick={() => start({ since, until })}
            className="btn btn-secondary btn-sm"
          >
            Fetch
          </button>
        </div>
      )}
      {message && <p className="text-[13px] text-muted">{message}</p>}
    </div>
  );
}

export type SpendRow = { id: number; day: string; channel: string; amount: string; note: string };

/** Ad spend no platform reports, so the marketing numbers include it. */
export function SpendCard({ rows, today }: { rows: SpendRow[]; today: string }) {
  const [state, action, pending] = useActionState(addSpend, idle);
  const submit = useSubmit(action);
  const [formKey, setFormKey] = useState(0);
  const [lastAt, setLastAt] = useState(0);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (state.status === "saved" && state.at !== lastAt) {
    setLastAt(state.at);
    setFormKey((k) => k + 1);
  }

  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">
        Other ad spend
        <Help>
          Promotion Meta and Google don’t report (flyers, influencers, printed menus). It counts
          towards marketing costs in the reports.
        </Help>
      </h2>

      <form
        key={formKey}
        onSubmit={submit}
        className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr_7rem] wide:grid-cols-[9rem_1fr_7rem_1.5fr_auto] wide:items-end"
      >
        <div>
          <label htmlFor="spend-day" className="label">
            Date
          </label>
          <input
            id="spend-day"
            name="day"
            type="date"
            required
            defaultValue={today}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="spend-channel" className="label">
            For
          </label>
          <input
            id="spend-channel"
            name="channel"
            required
            maxLength={80}
            placeholder="Influencer: @tripolifoodie"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="spend-amount" className="label">
            Amount ($)
          </label>
          <input
            id="spend-amount"
            name="amount"
            type="number"
            min={0.01}
            step={0.01}
            required
            className="field"
          />
        </div>
        <div className="sm:col-span-3 wide:col-span-1">
          <label htmlFor="spend-note" className="label">
            Note <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="spend-note" name="note" maxLength={200} className="field" />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          <Icon name="plus" className="size-4" />
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      <div className="mt-2">
        <FormStatus state={state} />
      </div>

      {rows.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-line border-t border-line">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="w-24 text-muted tabular-nums">{row.day}</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{row.channel}</span>
                {row.note && <span className="text-muted"> · {row.note}</span>}
              </span>
              <span className="tabular-nums">{row.amount}</span>
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove ${row.channel}`}
                onClick={() => {
                  if (confirm(`Remove ${row.channel}, ${row.amount}?`))
                    startBusy(async () => setError((await removeSpend(row.id)).error));
                }}
                className="btn btn-ghost btn-sm px-1.5 text-bad"
              >
                <Icon name="trash" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-muted">Nothing entered in the last 90 days.</p>
      )}
      {error && <p className="mt-2 text-[13px] text-bad">{error}</p>}
    </section>
  );
}
