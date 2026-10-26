import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { after } from "next/server";
import type { PlaceOrderInput } from "@/lib/checkout";
import * as service from "@/lib/supabase/service";
import { placeOrder } from "./orders";
import * as catalog from "./catalog";
import * as promotions from "./promotions";

vi.mock("next/server", () => ({ after: vi.fn() }));

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
  vi.mocked(after).mockClear();
});

// The saved order is deliberately independent of the current menu and request.
const savedOrder = () => ({
  public_token: "01fa13ea-8f90-4c8e-a9a9-d84d997110c8",
  number: 1001,
  fulfilment: "delivery" as const,
  customer_name: "Maya Haddad",
  customer_phone: "+96171234567",
  delivery_area_name_en: "Mina",
  delivery_area_name_ar: "الميناء",
  address_street: "Port Said Street",
  address_floor: "2",
  delivery_note: "Ring the bell",
  subtotal_cents: 2400,
  discount_cents: 480,
  delivery_fee_cents: 200,
  total_cents: 2120,
  discount_code: "SWEET20",
  order_items: [
    {
      position: 1,
      name_en: "Creamy Profiteroles",
      name_ar: "بروفيترول بالكريمة",
      quantity: 2,
      note: "Extra napkins",
      order_item_options: [
        { group_key: "chocolate", option_name_en: "Nutella", option_name_ar: "نوتيلا" },
        { group_key: "fruit", option_name_en: "Strawberries", option_name_ar: "فراولة" },
      ],
    },
  ],
});

function mockBackend() {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const single = vi.fn().mockResolvedValue({
    data: {
      order_id: "5e49b9a3-0cbe-4c97-9f60-dcb497a05d91",
      order_number: 1001,
      public_token: savedOrder().public_token,
      total_cents: 2120,
      already_placed: false,
    },
    error: null,
  });
  const rpc = vi.fn().mockReturnValue({ single });
  vi.spyOn(service, "serviceClient").mockReturnValue({
    from,
    rpc,
  } as unknown as NonNullable<ReturnType<typeof service.serviceClient>>);
  return { maybeSingle, eq, from, rpc, single };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("placeOrder", () => {
  it.each(["firstOrder", "usedUp", "expired"] as const)(
    "recovers a saved order after its promo becomes %s without creating it again",
    async (error) => {
      const backend = mockBackend();
      const promo = vi.spyOn(promotions, "checkPromo").mockResolvedValue({
        ok: true,
        rule: { code: "SWEET20", kind: "percent", value: 20 },
      });
      const input: PlaceOrderInput = {
        ...base(),
        mode: "delivery",
        fields: { ...base().fields, area: "mina", street: "Port Said Street" },
        promoCode: "SWEET20",
        quotedTotal: 2120,
      };
      // The first response is lost after the database commits the order.
      expect((await placeOrder(input)).ok).toBe(true);
      backend.maybeSingle.mockResolvedValue({ data: savedOrder(), error: null });
      promo.mockResolvedValue({ ok: false, error });

      const retry = await placeOrder(input);
      expect(retry).toMatchObject({
        ok: true,
        order: {
          ref: savedOrder().public_token,
          number: "TSS-1001",
          promoCode: "SWEET20",
          totals: { subtotal: 2400, discount: 480, deliveryFee: 200, total: 2120 },
          demo: false,
        },
      });
      expect(backend.eq).toHaveBeenCalledWith("idempotency_key", input.idempotencyKey);
      expect(promo).toHaveBeenCalledTimes(1);
      expect(backend.rpc).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(1);
    },
  );

  it("recovers the stored snapshot before consulting changed menu, areas or hours", async () => {
    const backend = mockBackend();
    const saved = savedOrder();
    // Nested database relations need not arrive in their display order.
    saved.order_items.unshift({
      position: 2,
      name_en: "Sweet Box",
      name_ar: "علبة حلو",
      quantity: 1,
      note: "",
      order_item_options: [
        { group_key: "dessert", option_name_en: "Crepe", option_name_ar: "كريب" },
        { group_key: "dessert/fruit", option_name_en: "Banana", option_name_ar: "موز" },
        { group_key: "drink", option_name_en: "Milkshake", option_name_ar: "ميلك شيك" },
      ],
    });
    backend.maybeSingle.mockResolvedValue({ data: saved, error: null });
    const menu = vi.spyOn(catalog, "getMenu").mockRejectedValue(new Error("Menu is unavailable"));
    const branch = vi.spyOn(catalog, "getOrderingBranch");
    const promo = vi.spyOn(promotions, "checkPromo");
    vi.setSystemTime(CLOSED);

    const retry = await placeOrder({
      ...base(),
      fields: { ...base().fields, name: "Changed name", phone: "76 111 222" },
      quotedTotal: 9999,
    });
    expect(retry).toEqual({
      ok: true,
      order: {
        ref: saved.public_token,
        number: "TSS-1001",
        mode: "delivery",
        name: "Maya Haddad",
        phone: "+96171234567",
        address: {
          area: { en: "Mina", ar: "الميناء" },
          street: "Port Said Street",
          floor: "2",
          note: "Ring the bell",
        },
        lines: [
          {
            name: { en: "Creamy Profiteroles", ar: "بروفيترول بالكريمة" },
            options: { en: ["Nutella", "Strawberries"], ar: ["نوتيلا", "فراولة"] },
            qty: 2,
            note: "Extra napkins",
          },
          {
            name: { en: "Sweet Box", ar: "علبة حلو" },
            options: { en: ["Crepe (Banana)", "Milkshake"], ar: ["كريب (موز)", "ميلك شيك"] },
            qty: 1,
            note: "",
          },
        ],
        totals: { subtotal: 2400, discount: 480, deliveryFee: 200, total: 2120 },
        promoCode: "SWEET20",
        demo: false,
      },
    });
    expect(menu).not.toHaveBeenCalled();
    expect(branch).not.toHaveBeenCalled();
    expect(promo).not.toHaveBeenCalled();
    expect(backend.rpc).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("recovers a concurrent submission that consumes the promo during validation", async () => {
    const backend = mockBackend();
    backend.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: savedOrder(), error: null });
    vi.spyOn(promotions, "checkPromo").mockResolvedValue({ ok: false, error: "firstOrder" });

    expect(await placeOrder({ ...base(), promoCode: "SWEET20" })).toMatchObject({
      ok: true,
      order: { ref: savedOrder().public_token, totals: { total: 2120 } },
    });
    expect(backend.rpc).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it.each(["firstOrder", "usedUp", "expired"] as const)(
    "still rejects a new order when its promo is %s",
    async (error) => {
      const backend = mockBackend();
      vi.spyOn(promotions, "checkPromo").mockResolvedValue({ ok: false, error });

      expect(await placeOrder({ ...base(), promoCode: "SWEET20" })).toEqual({
        ok: false,
        code: "promo",
        error,
      });
      expect(backend.rpc).not.toHaveBeenCalled();
      expect(after).not.toHaveBeenCalled();
    },
  );

  it("returns saved totals and choices when create_order detects a concurrent retry", async () => {
    const backend = mockBackend();
    backend.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: savedOrder(), error: null });
    backend.single.mockResolvedValue({
      data: { public_token: savedOrder().public_token, already_placed: true },
      error: null,
    });
    expect(await placeOrder(base())).toMatchObject({
      ok: true,
      order: { mode: "delivery", totals: { total: 2120 }, promoCode: "SWEET20" },
    });
    expect(backend.rpc).toHaveBeenCalledTimes(1);
    expect(after).not.toHaveBeenCalled();
  });

  it("recovers the saved order after create_order returns a lost-response error", async () => {
    const backend = mockBackend();
    backend.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: savedOrder(), error: null });
    backend.single.mockResolvedValue({ data: null, error: { message: "Response lost" } });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await placeOrder(base())).toMatchObject({
      ok: true,
      order: { ref: savedOrder().public_token },
    });
    expect(after).not.toHaveBeenCalled();
  });

  it("fails safely if the saved attempt cannot be checked", async () => {
    const backend = mockBackend();
    backend.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Database unavailable" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await placeOrder(base())).toEqual({ ok: false, code: "failed" });
    expect(backend.rpc).not.toHaveBeenCalled();
  });

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
