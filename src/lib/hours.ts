// Opening hours, always in Beirut time whatever the visitor's own time zone.
// The schedule comes from the database (branch hours, closures, the ordering
// switch), loaded by src/server/catalog.ts and passed down to the browser.
import { site, tripoliHours } from "@/data/site";
import type { Locale } from "@/i18n/config";

/**
 * The admin's online-ordering switch: follow the opening hours, take orders
 * whatever the hours say, or take none.
 */
export type Ordering = "hours" | "open" | "paused";

/**
 * A branch's week. `hours` is [open, close] in minutes after midnight per
 * weekday (0 = Sunday), or null when closed all day; a close past 1440 runs
 * into the next day. `closures` are whole days off (YYYY-MM-DD, Beirut).
 */
export type Schedule = {
  hours: ([number, number] | null)[];
  closures: string[];
  /** Online orders stop this many minutes before closing. */
  lastOrderMinutes: number;
  /** "paused" also when the branch doesn't take online orders at all. */
  ordering: Ordering;
};

/** The built-in Tripoli week, used while Supabase isn't configured. */
export const builtInSchedule: Schedule = {
  hours: tripoliHours,
  closures: [],
  lastOrderMinutes: 15,
  ordering: "hours",
};

const beirutClock = new Intl.DateTimeFormat("en-US", {
  timeZone: site.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day of the week (0 = Sunday), minutes after midnight and the date, in Beirut. */
export function beirutTime(date = new Date()) {
  const parts = Object.fromEntries(beirutClock.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    day: weekdays.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** The calendar date `days` after a YYYY-MM-DD date. */
function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type StoreStatus =
  /**
   * `closesAt`: minutes after today's midnight; past 1440 runs into tomorrow.
   * Null while ordering is switched open whatever the hours.
   */
  | { open: true; closesAt: number | null }
  /**
   * `reopens`: when online orders start again, `inDays` days from today at
   * `at` minutes after midnight. Null while paused, or with no hours ahead.
   */
  | { open: false; reopens: { inDays: number; at: number } | null };

/**
 * Whether online orders are being taken. Orders stop `lastOrderMinutes`
 * before closing; a closure day cancels that day's session (including the
 * part past midnight). The ordering switch overrides the hours.
 */
export function storeStatus(schedule: Schedule, date = new Date()): StoreStatus {
  if (schedule.ordering === "paused") return { open: false, reopens: null };
  if (schedule.ordering === "open") return { open: true, closesAt: null };
  const { hours, closures, lastOrderMinutes } = schedule;
  const now = beirutTime(date);
  const closedOn = (inDays: number) => closures.includes(addDays(now.date, inDays));

  // Still inside last night's session (e.g. 00:30 when yesterday closes at 1 am)?
  const yesterday = hours[(now.day + 6) % 7];
  if (yesterday && yesterday[1] > 1440 && !closedOn(-1)) {
    const lateClose = yesterday[1] - 1440;
    if (now.minutes < lateClose - lastOrderMinutes) return { open: true, closesAt: lateClose };
  }

  const today = hours[now.day];
  if (today && !closedOn(0)) {
    const [open, close] = today;
    if (now.minutes >= open && now.minutes < close - lastOrderMinutes) {
      return { open: true, closesAt: close };
    }
    if (now.minutes < open) return { open: false, reopens: { inDays: 0, at: open } };
  }

  for (let inDays = 1; inDays <= 7; inDays++) {
    const day = hours[(now.day + inDays) % 7];
    if (day && !closedOn(inDays)) return { open: false, reopens: { inDays, at: day[0] } };
  }
  return { open: false, reopens: null };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "12 pm", "6:55 pm" / "12 م", "6:55 م": short clock times for status lines. */
export function formatClock(minutes: number, lang: Locale) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  const time = `${hour % 12 || 12}${minute ? `:${pad(minute)}` : ""}`;
  if (lang === "ar") return `${time} ${hour < 12 ? "ص" : "م"}`;
  return `${time} ${hour < 12 ? "am" : "pm"}`;
}

/**
 * Opening-hours copy: "12 pm" in English; in Arabic the hour with its part
 * of the day ("12 ظهراً", "1 فجراً"), as the shop writes it.
 */
export function formatOpeningTime(minutes: number, lang: Locale) {
  if (lang === "en") return formatClock(minutes, lang);
  const m = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  const time = `${hour % 12 || 12}${minute ? `:${pad(minute)}` : ""}`;
  const part =
    hour === 0 || hour >= 22
      ? "ليلاً"
      : hour < 5
        ? "فجراً"
        : hour < 12
          ? "صباحاً"
          : hour < 15
            ? "ظهراً"
            : hour < 18
              ? "عصراً"
              : "مساءً";
  return `${time} ${part}`;
}

export type HoursLabels = {
  /** Short day names, Sunday first. */
  days: string[];
  everyDay: string;
  closed: string;
};

/**
 * The week as rows for display, Monday first, with runs of days that share
 * hours merged: [{ days: "Mon–Thu", hours: "12 pm – 12 am" }, …].
 */
export function weekHours(schedule: Schedule, lang: Locale, labels: HoursLabels) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const label = (day: number) => {
    const h = schedule.hours[day];
    return h
      ? `${formatOpeningTime(h[0], lang)} – ${formatOpeningTime(h[1], lang)}`
      : labels.closed;
  };
  const runs: { from: number; to: number; hours: string }[] = [];
  for (const day of order) {
    const hours = label(day);
    const last = runs.at(-1);
    if (last && last.hours === hours) last.to = day;
    else runs.push({ from: day, to: day, hours });
  }
  if (runs.length === 1) return [{ days: labels.everyDay, hours: runs[0].hours }];
  return runs.map((run) => ({
    days:
      run.from === run.to
        ? labels.days[run.from]
        : `${labels.days[run.from]}–${labels.days[run.to]}`,
    hours: run.hours,
  }));
}
