"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Ordering } from "@/lib/hours";
import { setOrdering } from "./actions";

const choices: { value: Ordering; title: string; body: string }[] = [
  {
    value: "hours",
    title: "Follow opening hours",
    body: "Orders open and close with the shop.",
  },
  {
    value: "open",
    title: "Open now",
    body: "Take orders whatever the time: previews, events, late nights.",
  },
  {
    value: "paused",
    title: "Paused",
    body: "Take no orders until you switch back.",
  },
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
            <span>
              <span className="block font-semibold">{choice.title}</span>
              <span className="block text-[13px] leading-[18px] text-muted">{choice.body}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {shown === "open" && (
        <p className="mt-3 rounded-[10px] bg-wait-soft px-3 py-2 text-[13px]">
          Orders come in at any hour while this is on. Switch back to opening hours when you’re
          done.
        </p>
      )}
      {!canChange && <p className="hint">Managers and owners can change this.</p>}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-bad">
          {error}
        </p>
      )}
    </section>
  );
}
