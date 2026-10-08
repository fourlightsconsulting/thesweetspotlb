// The ordering switch's state in a sentence, for the admin.
import { beirutTime, formatClock, type Schedule, storeStatus } from "@/lib/hours";

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** What the ordering switch means right now, in a sentence. */
export function orderingNote(schedule: Schedule, now = new Date()) {
  if (schedule.ordering === "open") return "Taking orders now, whatever the hours.";
  if (schedule.ordering === "paused") return "Paused: the website says ordering is paused.";
  const status = storeStatus(schedule, now);
  if (status.open) {
    const last = (status.closesAt ?? 0) - schedule.lastOrderMinutes;
    return `Following opening hours: last orders at ${formatClock(last, "en")}.`;
  }
  if (!status.reopens) return "Following opening hours, but none are set.";
  const { inDays, at } = status.reopens;
  const day =
    inDays === 0
      ? "today"
      : inDays === 1
        ? "tomorrow"
        : `on ${weekdayNames[(beirutTime(now).day + inDays) % 7]}`;
  return `Following opening hours: closed until ${day} at ${formatClock(at, "en")}.`;
}
