"use client";

import { useSyncExternalStore } from "react";
import { Circle } from "@/components/doodles";
import { storeStatus } from "@/lib/hours";

const isOpenNow = () => storeStatus().open;

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
