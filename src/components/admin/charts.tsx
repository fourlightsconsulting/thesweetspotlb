import type { ReactNode } from "react";

// Dashboard charts as plain SVG and HTML: no chart library (they render on
// the server and ship no JavaScript, which keeps the Worker small). Hover
// details come from native tooltips.

const tones = {
  accent: "var(--color-accent)",
  muted: "color-mix(in oklab, var(--color-chocolate) 35%, transparent)",
  wait: "var(--color-wait)",
  bad: "var(--color-bad)",
} as const;
type Tone = keyof typeof tones;

export const count = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString("en");

export const percent = (part: number, whole: number, digits = 0) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(digits)}%` : "—";

// ─── Numbers ──────────────────────────────────────────────────────────────

/** "+12%" against the previous period, coloured by whether up is good. */
function Change({
  now,
  before,
  upIsGood = true,
}: {
  now: number;
  before: number;
  upIsGood?: boolean;
}) {
  if (!before) return now ? <span className="pill">new</span> : null;
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span className="pill">same</span>;
  const good = change > 0 === upIsGood;
  return (
    <span className={`pill ${good ? "bg-accent-soft text-accent" : "bg-bad-soft text-bad"}`}>
      {change > 0 ? "+" : "−"}
      {Math.abs(change * 100).toFixed(0)}%
    </span>
  );
}

/** One headline number, with the change since the previous period. */
export function Kpi({
  label,
  value,
  now,
  before,
  upIsGood,
  hint,
}: {
  label: string;
  value: string;
  /** Raw values for the change pill; omit to show none. */
  now?: number;
  before?: number;
  upIsGood?: boolean;
  hint?: string;
}) {
  return (
    <div className="card flex flex-col gap-1 p-4" title={hint}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-2xl leading-8 font-bold tabular-nums">{value}</p>
      {now !== undefined && before !== undefined && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <Change now={now} before={before} upIsGood={upIsGood} />
          vs previous
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 wide:grid-cols-6">{children}</div>;
}

/** A titled card for one chart or table. */
export function Panel({
  title,
  note,
  children,
  className = "",
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card min-w-0 p-5 ${className}`}>
      <h2 className="text-base font-bold">{title}</h2>
      {note && <p className="mt-0.5 text-[13px] text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Empty({ children = "Nothing in this period." }: { children?: ReactNode }) {
  return <p className="py-6 text-center text-muted">{children}</p>;
}

// ─── Trend ────────────────────────────────────────────────────────────────

export type Series = { name: string; values: number[]; tone?: Tone; dashed?: boolean };

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 8 };

/**
 * Lines over days, the first series filled. `labels` name each point (days);
 * a dashed series is usually the previous period, lined up day by day.
 */
export function TrendChart({
  labels,
  series,
  format = count,
}: {
  labels: string[];
  series: Series[];
  format?: (n: number) => string;
}) {
  const points = Math.max(...series.map((s) => s.values.length), 1);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) =>
    PAD.left +
    (points === 1
      ? (W - PAD.left - PAD.right) / 2
      : (i * (W - PAD.left - PAD.right)) / (points - 1));
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const path = (values: number[]) =>
    values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, Math.floor((labels.length - 1) / 2), labels.length - 1].filter(
    (t, i, all) => t >= 0 && all.indexOf(t) === i,
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" width="18" height="6">
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={tones[s.tone ?? "accent"]}
                strokeWidth="2.5"
                strokeDasharray={s.dashed ? "4 3" : undefined}
              />
            </svg>
            {s.name}
          </span>
        ))}
        <span className="ms-auto">Top: {format(max)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={series.map((s) => s.name).join(", ")}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="var(--color-line)"
            strokeWidth="1"
          />
        ))}
        {series.map((s, index) =>
          s.values.length === 0 ? null : (
            <g key={s.name}>
              {index === 0 && !s.dashed && s.values.length > 1 && (
                <path
                  d={`${path(s.values)} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                  fill={tones[s.tone ?? "accent"]}
                  opacity="0.1"
                />
              )}
              <path
                d={path(s.values)}
                fill="none"
                stroke={tones[s.tone ?? "accent"]}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "6 5" : undefined}
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="9" fill="transparent">
                  <title>{`${labels[i] ?? ""} · ${s.name}: ${format(v)}`}</title>
                </circle>
              ))}
            </g>
          ),
        )}
        {ticks.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={H - 6}
            textAnchor={t === 0 ? "start" : t === labels.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill="var(--color-muted)"
          >
            {labels[t]}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Bars ─────────────────────────────────────────────────────────────────

export type BarRow = { name: string; value: number; detail?: string };

/** Ranked horizontal bars, each with its value (and an optional detail). */
export function Bars({
  rows,
  format = count,
  tone = "accent",
  empty,
}: {
  rows: BarRow[];
  format?: (n: number) => string;
  tone?: Tone;
  empty?: string;
}) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.name} className="text-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate" title={row.name}>
              {row.name}
            </span>
            <span className="flex-none tabular-nums">
              <span className="font-semibold">{format(row.value)}</span>
              {row.detail && <span className="text-muted"> · {row.detail}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-tint">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: tones[tone] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────

/** Steps that narrow, with each step's share of the one before. */
export function Funnel({ steps }: { steps: { name: string; value: number; note?: string }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <li
          key={step.name}
          className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem_3rem] items-center gap-3 text-[13px]"
        >
          <span className="truncate" title={step.note}>
            {step.name}
          </span>
          <div className="h-5 rounded-[6px] bg-tint">
            <div
              className="h-full rounded-[6px] bg-accent"
              style={{ width: `${Math.max(1.5, (step.value / top) * 100)}%` }}
            />
          </div>
          <span className="text-end font-semibold tabular-nums">{count(step.value)}</span>
          <span className="text-end text-muted tabular-nums">
            {i === 0 ? "" : percent(step.value, steps[i - 1].value)}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW = [1, 2, 3, 4, 5, 6, 0];

/** Weekday × hour (Beirut), darker for more. */
export function Heatmap({
  cells,
  unit,
}: {
  cells: { dow: number; hour: number; value: number }[];
  unit: string;
}) {
  if (cells.length === 0) return <Empty />;
  const max = Math.max(1, ...cells.map((c) => c.value));
  const value = (dow: number, hour: number) =>
    cells.find((c) => c.dow === dow && c.hour === hour)?.value ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-[2px] text-[10px]">
        <thead>
          <tr>
            <th className="w-9" />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="font-normal text-muted">
                {h % 3 === 0 ? h : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DOW.map((dow, i) => (
            <tr key={dow}>
              <th className="pe-1 text-start font-normal text-muted">{DAYS[i]}</th>
              {Array.from({ length: 24 }, (_, hour) => {
                const v = value(dow, hour);
                return (
                  <td
                    key={hour}
                    title={`${DAYS[i]} ${hour}:00 · ${v} ${unit}`}
                    className="h-5 rounded-[3px]"
                    style={{
                      background: v
                        ? `color-mix(in oklab, var(--color-accent) ${Math.round(15 + (v / max) * 85)}%, var(--color-surface))`
                        : "var(--color-tint)",
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tables ───────────────────────────────────────────────────────────────

/** A compact table: the first column left, the rest right-aligned numbers. */
export function DataTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: (string | number | ReactNode)[][];
  empty?: string;
}) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[320px] text-[13px]">
        <thead className="text-[12px] text-muted">
          <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:font-semibold [&>th:first-child]:text-start [&>th:not(:first-child)]:text-end">
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr
              key={i}
              className="[&>td]:px-5 [&>td]:py-2 [&>td:first-child]:max-w-[16rem] [&>td:first-child]:truncate [&>td:not(:first-child)]:text-end [&>td:not(:first-child)]:tabular-nums"
            >
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
