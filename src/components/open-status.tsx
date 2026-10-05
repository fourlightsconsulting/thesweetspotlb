"use client";

import { useSyncExternalStore } from "react";
import { Circle } from "@/components/doodles";
import { site, tripoliHours } from "@/data/site";

const beirutClock = new Intl.DateTimeFormat("en-US", {
  timeZone: site.timeZone,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isOpenNow() {
  const parts = Object.fromEntries(
    beirutClock.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const day = weekdays.indexOf(parts.weekday);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const [open, close] = tripoliHours[day];
  const [, closeYesterday] = tripoliHours[(day + 6) % 7];
  return (minutes >= open && minutes < close) || minutes < closeYesterday - 24 * 60;
}

const subscribeToMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};
// Pages are prerendered, so the status is only known in the browser.
const unknownOnServer = () => null;

type Props = { openLabel: string; closedLabel: string };

export function OpenStatus({ openLabel, closedLabel }: Props) {
  const open = useSyncExternalStore(subscribeToMinute, isOpenNow, unknownOnServer);
  if (open === null) return <span className="min-h-8" />;

  return (
    <span
      className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 text-sm font-bold ${open ? "text-blueberry" : "text-cacao"}`}
    >
      <span className={`size-2 rounded-full ${open ? "bg-blueberry" : "bg-cacao/50"}`} />
      {open ? openLabel : closedLabel}
      {open && (
        <Circle className="absolute -start-2.5 -top-2 h-[calc(100%+16px)] w-[calc(100%+20px)]" />
      )}
    </span>
  );
}
