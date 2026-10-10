"use client";

import { useEffect, useRef, useState } from "react";
import { dayLabel, presets, readPeriod } from "./period";

// The dashboards' one period control: a button showing the window and its
// days, opening a two-month calendar (one on phones) above the presets.
// Picking a preset keeps it open so the calendar redraws onto the new window;
// picking two days chooses those days and closes it. Days are YYYY-MM-DD
// strings in Beirut, the same as period.ts.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const monthOf = (day: string) => day.slice(0, 7);

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

const monthName = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabel = (month: string) => monthName.format(new Date(`${month}-01T12:00:00Z`));

const fullDay = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const stampDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const noon = (day: string) => new Date(`${day}T12:00:00Z`);

/** Monday-first cells for a month: blanks, then every day. */
function monthCells(month: string): (string | null)[] {
  const [year, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
}

/** The left month, so the window's last day lands on the right one. */
const viewFor = (to: string) => shiftMonth(monthOf(to), -1);

type Props = {
  preset: string;
  from: string;
  to: string;
  /** Today in Beirut, from the server. */
  today: string;
  onPreset: (key: string) => void;
  onCustom: (from: string, to: string) => void;
};

export function PeriodPicker({ preset, from, to, today, onPreset, onCustom }: Props) {
  const [open, setOpen] = useState(false);
  /** The first day of a selection in progress. */
  const [pending, setPending] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState(() => viewFor(to));
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    setPending(null);
    setHovered(null);
    setView(viewFor(to));
    setOpen(true);
  };

  const pickPreset = (key: string) => {
    setPending(null);
    setHovered(null);
    setView(viewFor(readPeriod({ period: key }, today).to));
    onPreset(key);
  };

  const pickDay = (day: string) => {
    if (!pending) {
      setPending(day);
      setHovered(day);
      return;
    }
    const [start, end] = day < pending ? [day, pending] : [pending, day];
    setPending(null);
    setHovered(null);
    setOpen(false);
    onCustom(start, end);
  };

  const other = hovered ?? pending;
  const shown =
    pending && other
      ? other < pending
        ? { from: other, to: pending }
        : { from: pending, to: other }
      : { from, to };
  const presetLabel = presets.find((p) => p.key === preset)?.label ?? "Custom range";
  const rangeLabel = from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`;
  const months = [view, shiftMonth(view, 1)];
  const canGoForward = months[1] < monthOf(today);

  const navClass =
    "inline-grid size-7 flex-none place-items-center rounded-[8px] text-muted hover:bg-tint hover:text-ink disabled:text-line-strong disabled:hover:bg-transparent";

  return (
    <div ref={wrapRef} className="relative max-[560px]:flex-1">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className="group flex min-h-10 w-full max-w-[230px] items-center gap-2 rounded-[10px] border border-line-strong bg-surface ps-3 pe-2 text-start transition-colors hover:border-accent aria-expanded:border-accent aria-expanded:bg-accent-soft max-[560px]:max-w-none"
      >
        <CalendarGlyph />
        <span className="grid min-w-0 flex-1 leading-[1.2]">
          <span className="truncate text-[13px] font-semibold text-ink">{presetLabel}</span>
          <span className="truncate text-[12px] text-muted tabular-nums">{rangeLabel}</span>
        </span>
        <Chevron className="flex-none text-muted transition-transform group-aria-expanded:rotate-180" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Period"
          className="absolute end-0 top-full z-40 mt-1.5 w-max max-[560px]:start-0 max-[560px]:end-auto max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_8px_24px_rgba(53,37,34,0.14)]"
        >
          <div className="flex items-center gap-3 border-b border-line bg-tint px-4 py-2.5">
            {(
              [
                ["From", shown.from],
                ["To", shown.to],
              ] as const
            ).map(([label, day], i) => (
              <span key={label} className="flex items-center gap-3">
                {i === 1 && <span className="text-muted">→</span>}
                <span className="grid gap-px">
                  <span className="text-[11px] tracking-[0.04em] text-muted uppercase">
                    {label}
                  </span>
                  <span className="text-[13px] font-semibold whitespace-nowrap tabular-nums">
                    {stampDay.format(noon(day))}
                  </span>
                </span>
              </span>
            ))}
            <span className="ms-auto text-[12px] whitespace-nowrap text-muted max-sm:hidden">
              {pending ? "Pick the last day" : "Pick two days"}
            </span>
          </div>

          <div
            className="flex gap-5 px-4 pt-4 pb-3"
            onMouseLeave={() => pending && setHovered(pending)}
          >
            {months.map((month, index) => (
              <div key={month} className={`w-[224px] ${index === 0 ? "max-sm:hidden" : ""}`}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setView(shiftMonth(view, -1))}
                    className={`${navClass} ${index === 1 ? "sm:invisible" : ""}`}
                  >
                    <Chevron className="rotate-90" />
                  </button>
                  <span className="flex-1 text-center text-[13px] font-semibold">
                    {monthLabel(month)}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    disabled={!canGoForward}
                    onClick={() => setView(shiftMonth(view, 1))}
                    className={`${navClass} ${index === 0 ? "invisible" : ""}`}
                  >
                    <Chevron className="-rotate-90" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-7 text-center text-[11px] tracking-[0.03em] text-muted uppercase">
                  {WEEKDAYS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div role="grid" aria-label={monthLabel(month)} className="mt-1 grid grid-cols-7">
                  {monthCells(month).map((day, i) => {
                    if (!day) return <span key={`pad-${i}`} className="h-[30px]" />;
                    const inRange = day >= shown.from && day <= shown.to;
                    const start = day === shown.from;
                    const end = day === shown.to;
                    return (
                      <span
                        key={day}
                        className={`grid h-[30px] place-items-center ${inRange ? "bg-accent-soft" : ""} ${start ? "rounded-s-full" : ""} ${end ? "rounded-e-full" : ""}`}
                      >
                        <button
                          type="button"
                          disabled={day > today}
                          aria-label={fullDay.format(noon(day))}
                          aria-pressed={inRange}
                          onMouseEnter={() => pending && setHovered(day)}
                          onFocus={() => pending && setHovered(day)}
                          onClick={() => pickDay(day)}
                          className={`size-7 rounded-full text-[13px] tabular-nums disabled:cursor-default disabled:text-line-strong ${
                            start || end
                              ? "bg-accent font-semibold text-surface hover:bg-accent-hover"
                              : "text-ink/80 enabled:hover:bg-tint enabled:hover:text-ink"
                          } ${day === today ? "ring-1 ring-line-strong ring-inset" : ""}`}
                        >
                          {Number(day.slice(8))}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div
            role="group"
            aria-label="Periods"
            className="grid grid-cols-2 gap-0.5 border-t border-line px-4 pt-3 pb-4 sm:grid-cols-3"
          >
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={p.key === preset}
                onClick={() => pickPreset(p.key)}
                className="min-h-9 truncate rounded-[10px] border border-transparent px-2.5 text-start text-[13px] text-muted hover:bg-tint hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:font-semibold aria-pressed:text-accent"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[15px] flex-none fill-none stroke-current stroke-[1.8] text-muted [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`size-3 fill-none ${className}`}>
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
