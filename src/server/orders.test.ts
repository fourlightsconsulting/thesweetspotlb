import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaceOrderInput } from "@/lib/checkout";
import { placeOrder } from "./orders";
import * as catalog from "./catalog";

const OPEN = new Date("2026-10-06T12:00:00Z"); // Tuesday, 3 pm in Beirut
const CLOSED = new Date("2026-10-06T06:00:00Z"); // Tuesday, 9 am in Beirut

const base = (): PlaceOrderInput => ({
  idempotencyKey: "3f0c1f0e-6a1b-4c64-9c55-7a3c8e2b9d11",
  lang: "en",
  mode: "pickup",
  fields: {
    name: "Maya Haddad",
    phone: "71 234 567",
    area: "",
    street: "",
    floor: "",
    driverNote: "",
  },
  promoCode: null,
  lines: [
    {
      itemId: "creamy-profiteroles",
      qty: 2,
      selections: { chocolate: ["nutella"], fruit: ["strawberry"] },
      note: "",
    },
  ],
  quotedTotal: 2400,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(OPEN);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("placeOrder", () => {
  it("places a valid order with prices worked out on the server", async () => {
    const result = await placeOrder(base());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.totals).toEqual({
      subtotal: 2400,
      discount: 0,
      deliveryFee: 0,
      total: 2400,
    });
    expect(result.order.phone).toBe("+96171234567");
    expect(result.order.number).toMatch(/^TSS-\d{4}$/);
    expect(result.order.lines[0].options.en).toEqual(["Nutella", "Strawberries"]);
    expect(result.order.demo).toBe(true);
  });

  it("takes the order even if the customer saw a different total", async () => {
    const result = await placeOrder({ ...base(), quotedTotal: 2200 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.order.totals.total).toBe(2400);
  });

  it("refuses unknown items and missing required choices", async () => {
    const unknown = base();
    unknown.lines[0].itemId = "free-cake";
    expect(await placeOrder(unknown)).toEqual({ ok: false, code: "items" });

    const noChoice = base();
    noChoice.lines[0].selections = { fruit: ["strawberry"] };
    expect(await placeOrder(noChoice)).toEqual({ ok: false, code: "items" });
  });

  it("checks the details, including the delivery area", async () => {
    const result = await placeOrder({
      ...base(),
      mode: "delivery",
      fields: { ...base().fields, phone: "12", area: "paris", street: "" },
    });
    expect(result).toEqual({
      ok: false,
      code: "invalid",
      fields: { phone: "phoneInvalid", area: "area", street: "street" },
    });
  });

  it("adds the delivery fee and applies SWEET20 to the food only", async () => {
    const result = await placeOrder({
      ...base(),
      mode: "delivery",
      fields: { ...base().fields, area: "mina", street: "Port Said Street" },
      promoCode: "sweet20",
      quotedTotal: 2400 - 480 + 200,
    });
    expect(result.ok && result.order.totals).toEqual({
      subtotal: 2400,
      discount: 480,
      deliveryFee: 200,
      total: 2120,
    });
  });

  it("rejects an unknown promo code", async () => {
    expect(await placeOrder({ ...base(), promoCode: "FREEFOOD" })).toEqual({
      ok: false,
      code: "promo",
      error: "invalid",
    });
  });

  it("charges the selected area's inherited zone fee, regardless of the quoted total", async () => {
    const branch = await catalog.getOrderingBranch();
    vi.spyOn(catalog, "getOrderingBranch").mockResolvedValue({
      ...branch,
      areas: branch.areas.map((area) => ({ ...area, fee: 450 })),
    });
    const result = await placeOrder({
      ...base(),
      mode: "delivery",
      fields: { ...base().fields, area: "mina", street: "Port Said Street" },
      quotedTotal: 2400,
    });
    expect(result.ok && result.order.totals).toEqual({
      subtotal: 2400,
      discount: 0,
      deliveryFee: 450,
      total: 2850,
    });
    expect(result.ok && result.order.address?.area).toEqual({ en: "Mina", ar: "الميناء" });
  });

  it("accepts configured area slugs longer than forty characters", async () => {
    const branch = await catalog.getOrderingBranch();
    const area = { ...branch.areas[0], id: "tripoli-delivery-area-with-a-long-but-valid-name" };
    vi.spyOn(catalog, "getOrderingBranch").mockResolvedValue({ ...branch, areas: [area] });
    const result = await placeOrder({
      ...base(),
      mode: "delivery",
      fields: { ...base().fields, area: area.id, street: "Port Said Street" },
    });
    expect(result.ok).toBe(true);
  });

  it("refuses an area removed from the current list", async () => {
    const branch = await catalog.getOrderingBranch();
    vi.spyOn(catalog, "getOrderingBranch").mockResolvedValue({ ...branch, areas: [] });
    expect(
      await placeOrder({
        ...base(),
        mode: "delivery",
        fields: { ...base().fields, area: "mina", street: "Port Said Street" },
      }),
    ).toEqual({ ok: false, code: "invalid", fields: { area: "area" } });
  });

  it("takes no orders while closed", async () => {
    vi.setSystemTime(CLOSED);
    expect(await placeOrder(base())).toEqual({
      ok: false,
      code: "closed",
      reopens: { inDays: 0, at: 720 },
    });
  });

  it("rejects malformed requests", async () => {
    const bad = base();
    bad.lines[0].qty = 0;
    expect(await placeOrder(bad)).toMatchObject({ ok: false, code: "invalid" });
    expect(await placeOrder({ ...base(), idempotencyKey: "nope" })).toMatchObject({
      ok: false,
      code: "invalid",
    });
  });

  it("refuses orders in production until the backend is connected", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await placeOrder(base())).toEqual({ ok: false, code: "unavailable" });
  });
});
