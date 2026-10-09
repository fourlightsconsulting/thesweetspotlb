// Small formatting rules for the Health page.

export type Status = "good" | "wait" | "bad" | "off";

export const statusLabels: Record<Status, { text: string; tone: string }> = {
  good: { text: "Working", tone: "bg-accent-soft text-accent" },
  wait: { text: "Needs a look", tone: "bg-wait-soft text-wait" },
  bad: { text: "Failing", tone: "bg-bad-soft text-bad" },
  off: { text: "Not set up", tone: "" },
};

/** A pg_cron schedule in words ("Every 10 minutes", "Hourly", "Daily"). */
export function scheduleLabel(cron: string) {
  const [minute, hour, day, month, weekday] = cron.trim().split(/\s+/);
  if (day !== "*" || month !== "*" || weekday !== "*") return cron;
  const everyMinutes = /^\*\/(\d+)$/.exec(minute ?? "");
  if (everyMinutes && hour === "*") return `Every ${everyMinutes[1]} minutes`;
  if (/^\d+$/.test(minute ?? "") && hour === "*") return "Hourly";
  const everyHours = /^\*\/(\d+)$/.exec(hour ?? "");
  if (/^\d+$/.test(minute ?? "") && everyHours) return `Every ${everyHours[1]} hours`;
  if (/^\d+$/.test(minute ?? "") && /^\d+$/.test(hour ?? "")) return "Daily";
  return cron;
}

/** "14.6 MB" */
export const megabytes = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(bytes < 100 * 1024 * 1024 ? 1 : 0)} MB`;

/** Typical events in an hour, from a week's count. */
export const usualPerHour = (week: number) => Math.round(week / (7 * 24));

/** Whether an ISO time is older than `hours` before `now`. */
export const olderThan = (iso: string | null, hours: number, now: number) =>
  !iso || Date.parse(iso) < now - hours * 3_600_000;
