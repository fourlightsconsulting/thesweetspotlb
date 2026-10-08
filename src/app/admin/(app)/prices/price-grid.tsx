"use client";

import { useState, useTransition } from "react";
import { money } from "@/components/admin/format";
import { savePrices } from "./actions";

export type PriceRow = { kind: "product" | "option"; id: string; name: string; cents: number };
export type PriceSection = { title: string; note?: string; rows: PriceRow[] };

const keyOf = (row: Pick<PriceRow, "kind" | "id">) => `${row.kind}:${row.id}`;

/** Rounds to the nearest step (25 = quarters), never below zero. */
const roundTo = (cents: number, step: number) =>
  Math.max(0, step > 1 ? Math.round(cents / step) * step : Math.round(cents));

/** Every price on one page: edit any, or change a selection by % or $. */
export function PriceGrid({ sections }: { sections: PriceSection[] }) {
  const all = sections.flatMap((s) => s.rows);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState(25);
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const current = (row: PriceRow) => edits[keyOf(row)] ?? row.cents;
  const changed = all.filter((row) => current(row) !== row.cents);

  const setPrice = (row: PriceRow, cents: number) =>
    setEdits((e) => {
      const next = { ...e };
      if (cents === row.cents) delete next[keyOf(row)];
      else next[keyOf(row)] = cents;
      return next;
    });

  const toggle = (keys: string[], on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  const applyBulk = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) return;
    setEdits((e) => {
      const next = { ...e };
      for (const row of all) {
        if (!selected.has(keyOf(row))) continue;
        const base = next[keyOf(row)] ?? row.cents;
        const raw = mode === "percent" ? base * (1 + value / 100) : base + value * 100;
        const cents = roundTo(raw, step);
        if (cents === row.cents) delete next[keyOf(row)];
        else next[keyOf(row)] = cents;
      }
      return next;
    });
    setMessage(null);
  };

  const save = () =>
    startSaving(async () => {
      const result = await savePrices(
        changed.map((row) => ({ kind: row.kind, id: row.id, cents: current(row) })),
      );
      if (result.error) setMessage({ tone: "bad", text: result.error });
      else {
        setMessage({
          tone: "good",
          text: `${changed.length} price${changed.length === 1 ? "" : "s"} saved.`,
        });
        setEdits({});
        setSelected(new Set());
      }
    });

  return (
    <>
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <p className="w-full text-[13px] text-muted">
          {selected.size === 0
            ? "Tick items to change several prices at once."
            : `${selected.size} selected.`}
        </p>
        <div className="flex rounded-[10px] border border-line-strong p-0.5">
          {(["percent", "amount"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className="rounded-[8px] px-3 py-1.5 text-[13px] font-semibold text-muted aria-pressed:bg-accent-soft aria-pressed:text-accent"
            >
              {m === "percent" ? "By %" : "By $"}
            </button>
          ))}
        </div>
        <input
          type="number"
          step={mode === "percent" ? 1 : 0.25}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={mode === "percent" ? "10 or −10" : "0.50 or −0.50"}
          aria-label={mode === "percent" ? "Change by percent" : "Change by dollars"}
          className="field w-36"
        />
        <label className="flex items-center gap-2 text-[13px]">
          Round to
          <select
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="field min-h-[34px] w-auto py-1"
          >
            <option value={1}>the cent</option>
            <option value={25}>$0.25</option>
            <option value={50}>$0.50</option>
            <option value={100}>$1</option>
          </select>
        </label>
        <button
          type="button"
          disabled={selected.size === 0 || !Number(amount)}
          onClick={applyBulk}
          className="btn btn-secondary"
        >
          Apply to selected
        </button>
      </div>

      <div className="flex flex-col gap-6 pb-20">
        {sections.map((section) => {
          const keys = section.rows.map(keyOf);
          const allOn = keys.length > 0 && keys.every((k) => selected.has(k));
          return (
            <section key={section.title}>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={(e) => toggle(keys, e.target.checked)}
                  aria-label={`Select all in ${section.title}`}
                  className="size-4 accent-accent"
                />
                <h2 className="text-[13px] font-semibold tracking-[0.04em] text-muted uppercase">
                  {section.title}
                </h2>
                {section.note && <span className="text-[12px] text-muted">{section.note}</span>}
              </div>
              <ul className="card divide-y divide-line">
                {section.rows.map((row) => {
                  const key = keyOf(row);
                  const value = current(row);
                  const isChanged = value !== row.cents;
                  return (
                    <li
                      key={key}
                      className={`flex items-center gap-3 px-3 py-2 ${isChanged ? "bg-wait-soft" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={(e) => toggle([key], e.target.checked)}
                        aria-label={`Select ${row.name}`}
                        className="size-4 accent-accent"
                      />
                      <span className="min-w-0 flex-1 truncate">{row.name}</span>
                      {isChanged && (
                        <span className="text-[13px] text-muted tabular-nums line-through">
                          {money(row.cents)}
                        </span>
                      )}
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
                          $
                        </span>
                        <input
                          // Remount when the value changes from outside (bulk, save).
                          key={value}
                          type="number"
                          min={0}
                          step={0.01}
                          defaultValue={(value / 100).toFixed(2)}
                          onBlur={(e) => {
                            const cents = Math.round(Number(e.target.value) * 100);
                            if (Number.isFinite(cents) && cents >= 0) setPrice(row, cents);
                          }}
                          aria-label={`Price of ${row.name}`}
                          className="field min-h-[34px] py-1 ps-6 text-end tabular-nums"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {(changed.length > 0 || message) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur wide:ps-[264px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
            {changed.length > 0 ? (
              <>
                <span className="font-semibold">
                  {changed.length} price{changed.length === 1 ? "" : "s"} changed
                </span>
                <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
                  {saving ? "Saving…" : "Save prices"}
                </button>
                <button
                  type="button"
                  onClick={() => setEdits({})}
                  disabled={saving}
                  className="btn btn-ghost"
                >
                  Discard
                </button>
              </>
            ) : null}
            {message && (
              <span
                className={`text-[13px] font-semibold ${message.tone === "good" ? "text-good" : "text-bad"}`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
