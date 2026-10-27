import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fields = {
  name: "Maya",
  phone: "71 234 567",
  area: "mina",
  street: "Port Said Street",
  floor: "2",
  driverNote: "Ring bell",
};

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("checkout storage", () => {
  it("loads, edits and completes checkout when storage property access is denied", async () => {
    const browser = {};
    for (const name of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(browser, name, {
        get: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
    }
    vi.stubGlobal("window", browser);
    const checkout = await import("./checkout-storage");
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual(checkout.emptyCheckoutFields);
    checkout.saveCheckoutDraft(fields);
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual(fields);

    const key = checkout.checkoutAttemptKey();
    expect(checkout.checkoutAttemptKey()).toBe(key);
    checkout.completeCheckout(fields, true);
    expect(checkout.checkoutAttemptKey()).not.toBe(key);
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual({ ...fields, driverNote: "" });
  });

  it("keeps the confirmation available in memory when browser storage is blocked", async () => {
    const browser = {};
    Object.defineProperty(browser, "localStorage", {
      get: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    vi.stubGlobal("window", browser);
    const { saveOrder, findOrder } = await import("./order-history");
    const order = {
      ref: crypto.randomUUID(),
      number: "TSS-1001",
      mode: "pickup" as const,
      name: fields.name,
      phone: "+96171234567",
      address: null,
      lines: [],
      totals: { subtotal: 100, discount: 0, deliveryFee: 0, total: 100 },
      promoCode: null,
      demo: false,
    };
    saveOrder(order);
    expect(findOrder(order.ref)).toEqual(order);
  });

  it("keeps attempts stable and clears drafts when storage writes fail", async () => {
    const local = storage();
    const session = storage();
    session.setItem("tss.checkout.v1", JSON.stringify(fields));
    for (const store of [local, session]) {
      store.setItem.mockImplementation(() => {
        throw new DOMException("Full", "QuotaExceededError");
      });
      store.removeItem.mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });
    }
    vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
    const checkout = await import("./checkout-storage");
    const key = checkout.checkoutAttemptKey();
    expect(checkout.checkoutAttemptKey()).toBe(key);
    checkout.completeCheckout(fields, false);
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual(checkout.emptyCheckoutFields);
    expect(checkout.checkoutAttemptKey()).not.toBe(key);
  });

  it("restores draft fields over remembered fields with normal storage", async () => {
    const local = storage();
    const session = storage();
    local.setItem("tss.customer.v1", JSON.stringify({ name: "Remembered", phone: fields.phone }));
    session.setItem("tss.checkout.v1", JSON.stringify({ name: "Draft" }));
    vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
    const checkout = await import("./checkout-storage");
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual({
      ...checkout.emptyCheckoutFields,
      name: "Draft",
      phone: fields.phone,
    });
    const key = checkout.checkoutAttemptKey();
    expect(session.getItem("tss.checkout.attempt")).toBe(key);
    checkout.completeCheckout(fields, true);
    expect(session.getItem("tss.checkout.attempt")).toBeNull();
    expect(session.getItem("tss.checkout.v1")).toBeNull();
    expect(JSON.parse(local.getItem("tss.customer.v1")!)).toEqual({ ...fields, driverNote: "" });
  });

  it("ignores corrupt or non-text saved fields", async () => {
    const local = storage();
    const session = storage();
    local.setItem("tss.customer.v1", "not-json");
    session.setItem(
      "tss.checkout.v1",
      JSON.stringify({ name: { invalid: true }, phone: fields.phone }),
    );
    vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
    const checkout = await import("./checkout-storage");
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual({
      ...checkout.emptyCheckoutFields,
      phone: fields.phone,
    });
  });

  it("does not keep browser data on the server", async () => {
    vi.stubGlobal("window", undefined);
    const checkout = await import("./checkout-storage");
    checkout.saveCheckoutDraft(fields);
    expect(JSON.parse(checkout.readCheckoutFields())).toEqual(checkout.emptyCheckoutFields);
  });
});
