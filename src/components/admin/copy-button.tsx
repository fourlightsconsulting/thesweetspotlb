"use client";

import { useState } from "react";
import { Icon } from "./icons";

/** Copies `value`, then says so for a moment. */
export function CopyButton({
  value,
  label = "Copy",
  className = "btn btn-secondary btn-sm",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!value}
      className={`${className} gap-1.5`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Icon name={copied ? "check" : "copy"} className="size-4" />
      {copied ? "Copied" : label}
    </button>
  );
}

/** A value to copy, shown in full (wrapped), with its button. */
export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <CopyButton value={value} />
      </div>
      <p className="rounded-[10px] bg-tint px-3 py-2 font-mono text-[12px] break-all select-all">
        {value || "—"}
      </p>
    </div>
  );
}
