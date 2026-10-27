import type { CheckoutFields } from "./checkout";
import { readBrowserStorage, writeBrowserStorage } from "./browser-storage";

const SAVED_KEY = "tss.customer.v1";
const DRAFT_KEY = "tss.checkout.v1";
const ATTEMPT_KEY = "tss.checkout.attempt";

export const emptyCheckoutFields: CheckoutFields = {
  name: "",
  phone: "",
  area: "",
  street: "",
  floor: "",
  driverNote: "",
};

function readFields(name: "localStorage" | "sessionStorage", key: string) {
  try {
    const raw = readBrowserStorage(name, key);
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== "object") return {};
    return Object.fromEntries(
      Object.keys(emptyCheckoutFields).flatMap((key) => {
        const value = (data as Record<string, unknown>)[key];
        return typeof value === "string" ? [[key, value]] : [];
      }),
    );
  } catch {
    return {};
  }
}

/** A stable string snapshot for useSyncExternalStore, with draft values first. */
export const readCheckoutFields = () =>
  JSON.stringify({
    ...emptyCheckoutFields,
    ...readFields("localStorage", SAVED_KEY),
    ...readFields("sessionStorage", DRAFT_KEY),
  });

export const saveCheckoutDraft = (fields: CheckoutFields) =>
  writeBrowserStorage("sessionStorage", DRAFT_KEY, JSON.stringify(fields));

export function checkoutAttemptKey() {
  const stored = readBrowserStorage("sessionStorage", ATTEMPT_KEY);
  if (stored) return stored;
  const key = crypto.randomUUID();
  writeBrowserStorage("sessionStorage", ATTEMPT_KEY, key);
  return key;
}

export function completeCheckout(fields: CheckoutFields, remember: boolean) {
  writeBrowserStorage(
    "localStorage",
    SAVED_KEY,
    remember ? JSON.stringify({ ...fields, driverNote: "" }) : null,
  );
  writeBrowserStorage("sessionStorage", DRAFT_KEY, null);
  writeBrowserStorage("sessionStorage", ATTEMPT_KEY, null);
}
