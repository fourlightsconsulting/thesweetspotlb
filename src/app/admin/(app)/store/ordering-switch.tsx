"use client";

import type { Ordering } from "@/lib/hours";

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
  onChange: (value: Ordering) => void;
};

/** Ordering changes join the Store page's draft until Save changes. */
export function OrderingSwitch({ value, open, note, onChange }: Props) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold">Online ordering</h2>
          <p className="mt-1 text-muted">{note}</p>
        </div>
        <span className={`pill ${open ? "bg-accent-soft text-good" : ""}`}>
          {open ? "Taking orders" : "Not taking orders"}
        </span>
      </div>

      <fieldset className="mt-4 grid gap-2 wide:grid-cols-3">
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
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="mt-0.5 size-4 flex-none accent-accent"
            />
            <span className="font-semibold">{choice.title}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
