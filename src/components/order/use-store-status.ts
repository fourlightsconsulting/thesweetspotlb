"use client";

import { useSyncExternalStore } from "react";
import { ordering } from "@/data/ordering";
import { type StoreStatus, storeStatus } from "@/lib/hours";

const subscribeToMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
};

// A string snapshot, so React sees "no change" between ticks.
const snapshot = () => JSON.stringify(storeStatus(new Date(), ordering.lastOrderMinutes));
const serverSnapshot = () => null;

/**
 * Whether online orders are being taken right now (they stop shortly before
 * closing). Null until the browser knows, since pages are prerendered.
 */
export function useOrderingStatus(): StoreStatus | null {
  const value = useSyncExternalStore(subscribeToMinute, snapshot, serverSnapshot);
  return value ? (JSON.parse(value) as StoreStatus) : null;
}
