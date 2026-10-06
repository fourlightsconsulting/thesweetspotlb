// Opening hours, always in Beirut time whatever the visitor's own time zone.
import { site, tripoliHours } from "@/data/site";
import type { Locale } from "@/i18n/config";

const beirutClock = new Intl.DateTimeFormat("en-US", {
  timeZone: site.timeZone,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day of the week (0 = Sunday) and minutes after midnight, in Beirut. */
export function beirutTime(date = new Date()) {
  const parts = Object.fromEntries(beirutClock.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    day: weekdays.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export type StoreStatus =
  /** `closesAt`: minutes after today's midnight; past 1440 runs into tomorrow. */
  | { open: true; closesAt: number }
  /** `opensAt`: minutes after midnight on the opening day. */
  | { open: false; opensAt: number; opensTomorrow: boolean };

/**
 * Whether the shop is open. With `lastOrderMinutes`, it counts as closed that
 * long before closing time, which is when online orders stop.
 */
export function storeStatus(
  date = new Date(),
  lastOrderMinutes = 0,
  hours: [number, number][] = tripoliHours,
): StoreStatus {
  const { day, minutes } = beirutTime(date);
  const [open, close] = hours[day];
  // Still inside last night's session (e.g. 00:30 when yesterday closes at 1 am)?
  const lateClose = hours[(day + 6) % 7][1] - 24 * 60;
  if (minutes < lateClose) {
    return minutes < lateClose - lastOrderMinutes
      ? { open: true, closesAt: lateClose }
      : { open: false, opensAt: open, opensTomorrow: false };
  }
  if (minutes >= open && minutes < close - lastOrderMinutes) return { open: true, closesAt: close };
  if (minutes < open) return { open: false, opensAt: open, opensTomorrow: false };
  return { open: false, opensAt: hours[(day + 1) % 7][0], opensTomorrow: true };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "12 pm", "6:55 pm" / "12 م", "6:55 م", in the style of the opening hours copy. */
export function formatClock(minutes: number, lang: Locale) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  const time = `${hour % 12 || 12}${minute ? `:${pad(minute)}` : ""}`;
  if (lang === "ar") return `${time} ${hour < 12 ? "ص" : "م"}`;
  return `${time} ${hour < 12 ? "am" : "pm"}`;
}

/** The Beirut clock time `minutesFromNow` after `date`, formatted for display. */
export function clockAfter(date: Date, minutesFromNow: number, lang: Locale) {
  return formatClock(beirutTime(date).minutes + minutesFromNow, lang);
}
