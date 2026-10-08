// Formatting for admin pages: money, Beirut times, order numbers, phones.
// Plain functions, used on the server and in the browser.
import { formatPrice } from "@/lib/money";
import { formatPhoneLocal } from "@/lib/phone";

const TZ = "Asia/Beirut";

/** "$12.50", "−$2.00". Generated totals come typed as nullable; they never are. */
export const money = (cents: number | null) => formatPrice(cents ?? 0, "en");

/** "TSS-1001", how orders are shown to customers and staff. */
export const orderLabel = (n: number) => `TSS-${n}`;

/** "71 234 567" for Lebanese numbers, the number as stored otherwise. */
export const phone = (e164: string) => (e164.startsWith("+961") ? formatPhoneLocal(e164) : e164);

/** A WhatsApp chat link for a number. */
export const whatsappLink = (e164: string) => `https://wa.me/${e164.replace(/^\+/, "")}`;

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

/** "6:45 pm", Beirut time. */
export const timeOf = (iso: string | Date) => clock.format(new Date(iso));

/** "6:45 pm" today, "8 Oct, 6:45 pm" on another day. */
export function when(iso: string | Date, now = new Date()) {
  const date = new Date(iso);
  return isoDay.format(date) === isoDay.format(now)
    ? timeOf(date)
    : `${dayMonth.format(date)}, ${timeOf(date)}`;
}

/** "Fri 9 Oct 2026". */
export const dateOf = (iso: string | Date) => fullDate.format(new Date(iso));

/** The Beirut calendar date, YYYY-MM-DD. */
export const beirutDate = (date = new Date()) => isoDay.format(date);

/** "just now", "4 min", "1 h 5 min": time since a moment, for queues. */
export function ago(iso: string | Date, now = new Date()) {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

/** Midnight of a Beirut date (default today), as an ISO timestamp. */
export const startOfBeirutDay = (date: string = beirutDate()) =>
  new Date(`${date}T00:00:00${beirutOffset(date)}`).toISOString();

/** The Beirut UTC offset on a date, "+03:00". */
function beirutOffset(date: string) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "");
  return offset || "+00:00";
}

/** A datetime-local value ("2026-10-10T18:00"), read as Beirut time, as ISO. */
export const beirutLocalToIso = (value: string) =>
  new Date(`${value}:00${beirutOffset(value.slice(0, 10))}`).toISOString();

/** An ISO time as a datetime-local value in Beirut ("2026-10-10T18:00"). */
export function isoToBeirutLocal(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
