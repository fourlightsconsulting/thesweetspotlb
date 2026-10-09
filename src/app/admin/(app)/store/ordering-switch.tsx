"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Ordering } from "@/lib/hours";
import { setOrdering } from "./actions";

const choices: { value: Ordering; title: string }[] = [
  { value: "hours", title: "Follow opening hours" },
  { value: "open", title: "Always open" },
  { value: "paused", title: "Paused" },
];

type Props = {
  value: Ordering;
  /** Whether the website takes orders right now, and why (or until when). */
  open: boolean;
  note: string;
  canChange: boolean;
};

/** When the website takes orders. Saves on choosing; managers and owners only. */
export function OrderingSwitch({ value, open, note, canChange }: Props) {
  const [saving, startSaving] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  const [error, setError] = useState<string | null>(null);

  const choose = (next: Ordering) => {
    setError(null);
    startSaving(async () => {
      setShown(next);
      const result = await setOrdering(next);
      setError(result.error);
    });
  };

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold">Online ordering</h2>
          <p className="mt-1 text-muted">{saving ? "Saving…" : note}</p>
        </div>
        <span className={`pill ${open ? "bg-accent-soft text-good" : ""}`}>
          {open ? "Taking orders" : "Not taking orders"}
        </span>
      </div>

      <fieldset disabled={!canChange || saving} className="mt-4 grid gap-2 wide:grid-cols-3">
        <legend className="sr-only">When the website takes orders</legend>
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="flex cursor-pointer gap-3 rounded-[12px] border border-line-strong p-3 transition-colors has-checked:border-accent has-checked:bg-accent-soft has-disabled:cursor-default"
          >
            <input
              type="radio"
              name="ordering"
              value={choice.value}
              checked={shown === choice.value}
              onChange={() => choose(choice.value)}
              className="mt-0.5 size-4 flex-none accent-accent"
            />
            <span className="font-semibold">{choice.title}</span>
          </label>
        ))}
      </fieldset>

      {!canChange && <p className="hint">Managers and owners can change this.</p>}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-bad">
          {error}
        </p>
      )}
    </section>
  );
}
