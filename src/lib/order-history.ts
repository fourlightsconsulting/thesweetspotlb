// Placed orders, kept on this device so the confirmation page can show them.
// Once orders are stored in Supabase, the page reads them from there instead.
import { useSyncExternalStore } from "react";
import type { PlacedOrder } from "@/lib/checkout";

const KEY = "tss.orders.v1";

function readAll(): PlacedOrder[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? (data as PlacedOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: PlacedOrder) {
  try {
    localStorage.setItem(KEY, JSON.stringify([order, ...readAll()].slice(0, 10)));
  } catch {
    // Storage blocked: the confirmation page falls back to "not found".
  }
}

export const findOrder = (ref: string) => readAll().find((o) => o.ref === ref) ?? null;

const subscribe = (onChange: () => void) => {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

/** The order with this ref from this device: undefined until the browser has looked, null if absent. */
export function usePlacedOrder(ref: string): PlacedOrder | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(findOrder(ref)),
    () => undefined,
  );
  return raw === undefined ? undefined : (JSON.parse(raw) as PlacedOrder | null);
}
