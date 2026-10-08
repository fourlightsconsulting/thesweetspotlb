"use client";

/** An on/off switch. With `name`, it also submits "on" in its form when on. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  name,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Read by screen readers; show your own visible label next to it. */
  label: string;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group relative inline-flex h-6 w-10 flex-none rounded-full bg-line-strong transition-colors disabled:opacity-50 aria-checked:bg-accent"
      >
        <span className="absolute start-0.5 top-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform group-aria-checked:translate-x-4 rtl:group-aria-checked:-translate-x-4" />
      </button>
      {name && checked && <input type="hidden" name={name} value="on" />}
    </>
  );
}
