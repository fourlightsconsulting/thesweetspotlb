"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type Schedule, type StoreStatus, storeStatus } from "@/lib/hours";

const subscribeToMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
};
const serverSnapshot = () => null;

/**
 * Whether online orders are being taken right now (they stop shortly before
 * closing). Null until the browser knows, since pages are prerendered.
 */
export function useOrderingStatus(schedule: Schedule): StoreStatus | null {
  // A string snapshot, so React sees "no change" between ticks.
  const snapshot = useCallback(() => JSON.stringify(storeStatus(schedule)), [schedule]);
  const value = useSyncExternalStore(subscribeToMinute, snapshot, serverSnapshot);
  return value ? (JSON.parse(value) as StoreStatus) : null;
}
