"use client";

import { useState } from "react";

/** A dollar amount in cents: free to type in, and it follows a reset from outside. */
export function PriceInput({
  cents,
  onChange,
  label,
  className = "",
  prefix = "+$",
}: {
  cents: number;
  onChange: (cents: number) => void;
  label: string;
  className?: string;
  prefix?: string;
}) {
  const [text, setText] = useState((cents / 100).toFixed(2));
  if ((Math.round(Number(text) * 100) || 0) !== cents) setText((cents / 100).toFixed(2));
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
        {prefix}
      </span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(Math.max(0, Math.round(Number(e.target.value) * 100) || 0));
        }}
        aria-label={label}
        className={`field ps-8 tabular-nums ${className}`}
      />
    </div>
  );
}
