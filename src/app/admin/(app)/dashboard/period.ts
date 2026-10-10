// The dashboards' period: a preset or two dates (Beirut days, inclusive),
// and the period just before it, the same length, for comparison.
import { beirutDate } from "@/components/admin/format";

export const presets = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "90d", label: "Last 90 days" },
  { key: "ytd", label: "Year to date" },
] as const;

export const DEFAULT_PRESET = "30d";

/** Whether to compare with the period before ("vs previous"); on unless switched off. */
export const readCompare = (params: Record<string, string | string[] | undefined>) =>
  params.compare !== "off";

export type Period = {
  from: string;
  to: string;
  /** The preset's key, or "custom". */
  preset: string;
  label: string;
  previous: { from: string; to: string };
  days: number;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;

/** Every day from `from` to `to`, inclusive. */
export const eachDay = (from: string, to: string) =>
  Array.from({ length: daysBetween(from, to) }, (_, i) => addDays(from, i));

const shortDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
/** "8 Oct". */
export const dayLabel = (date: string) => shortDay.format(new Date(`${date}T12:00:00Z`));

export function readPeriod(
  params: Record<string, string | string[] | undefined>,
  today = beirutDate(),
): Period {
  const preset = typeof params.period === "string" ? params.period : DEFAULT_PRESET;
  const from = typeof params.from === "string" && ISO.test(params.from) ? params.from : null;
  const to = typeof params.to === "string" && ISO.test(params.to) ? params.to : null;

  let range: { from: string; to: string };
  let key = preset;
  if (preset === "custom" && from && to && from <= to && daysBetween(from, to) <= 400) {
    range = { from, to: to > today ? today : to };
  } else {
    const month = today.slice(0, 7);
    const lastMonthEnd = addDays(`${month}-01`, -1);
    switch (preset) {
      case "today":
        range = { from: today, to: today };
        break;
      case "yesterday":
        range = { from: addDays(today, -1), to: addDays(today, -1) };
        break;
      case "7d":
        range = { from: addDays(today, -6), to: today };
        break;
      case "90d":
        range = { from: addDays(today, -89), to: today };
        break;
      case "month":
        range = { from: `${month}-01`, to: today };
        break;
      case "last-month":
        range = { from: `${lastMonthEnd.slice(0, 7)}-01`, to: lastMonthEnd };
        break;
      case "ytd":
        range = { from: `${today.slice(0, 4)}-01-01`, to: today };
        break;
      default:
        key = DEFAULT_PRESET;
        range = { from: addDays(today, -29), to: today };
    }
  }

  const days = daysBetween(range.from, range.to);
  const label =
    presets.find((p) => p.key === key)?.label ??
    (range.from === range.to
      ? dayLabel(range.from)
      : `${dayLabel(range.from)} – ${dayLabel(range.to)}`);
  return {
    ...range,
    preset: presets.some((p) => p.key === key) ? key : "custom",
    label,
    previous: { from: addDays(range.from, -days), to: addDays(range.from, -1) },
    days,
  };
}
