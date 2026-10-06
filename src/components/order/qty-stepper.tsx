type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  labels: { decrease: string; increase: string; quantity: string };
  size?: "sm" | "lg";
};

/** − n + control. At `min` 0 the minus removes the line, so it stays enabled. */
export function QtyStepper({ value, onChange, min = 1, max, labels, size = "sm" }: Props) {
  const button =
    size === "lg"
      ? "flex size-10 items-center justify-center rounded-[12px] transition-colors hover:bg-strawberry-milk disabled:opacity-35 disabled:hover:bg-transparent desk:size-12"
      : "flex size-9 items-center justify-center rounded-[9px] transition-colors hover:bg-strawberry-milk disabled:opacity-35 disabled:hover:bg-transparent";
  const icon = size === "lg" ? "size-[18px]" : "size-3.5";

  return (
    <div
      role="group"
      aria-label={labels.quantity}
      className={`inline-flex flex-none items-center border-chocolate/18 bg-whipped font-ui font-bold ${size === "lg" ? "rounded-[14px] border-[1.5px] p-0.5 text-lg" : "rounded-[11px] border-[1.5px] text-sm"}`}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={labels.decrease}
        className={button}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${icon} fill-none stroke-current stroke-[2.6] [stroke-linecap:round]`}
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <output aria-live="polite" className={`text-center ${size === "lg" ? "min-w-8" : "min-w-6"}`}>
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={labels.increase}
        className={button}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${icon} fill-none stroke-current stroke-[2.6] [stroke-linecap:round]`}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
