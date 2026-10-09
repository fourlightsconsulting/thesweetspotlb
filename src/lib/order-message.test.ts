import { describe, expect, it } from "vitest";
import ar from "@/i18n/dictionaries/ar";
import en from "@/i18n/dictionaries/en";
import type { PlacedOrder } from "./checkout";
import { orderMessage, whatsappMessageUrl } from "./order-message";

const order: PlacedOrder = {
  ref: "4f0c2a3e-1111-4222-8333-944455556666",
  number: "TSS-1042",
  placedAt: "2026-10-09T18:00:00Z",
  mode: "delivery",
  name: "Rana",
  phone: "+96170123456",
  address: { zone: { en: "Mina", ar: "الميناء" }, street: "Port street", floor: "3rd floor" },
  lines: [
    {
      name: { en: "Nutella Crêpe", ar: "كريب نوتيلا" },
      options: { en: "Strawberries", ar: "فريز" },
      note: "No nuts",
      qty: 2,
      total: 1300,
    },
    {
      name: { en: "Oreo Milkshake", ar: "ميلك شيك أوريو" },
      options: { en: "", ar: "" },
      note: "",
      qty: 1,
      total: 500,
    },
  ],
  totals: { subtotal: 1800, discount: 360, deliveryFee: 200, total: 1640 },
  promoCode: "SWEET20",
  eta: [30, 45],
  demo: false,
};

describe("orderMessage", () => {
  it("writes the whole order for the shop", () => {
    expect(orderMessage(order, "en", en.whatsappOrder, en.order)).toBe(
      [
        "Hi The Sweet Spot! Here’s my order *TSS-1042* from the website.",
        "",
        "2 × Nutella Crêpe",
        "   Strawberries",
        "   Note: No nuts",
        "1 × Oreo Milkshake",
        "",
        "Subtotal: $18.00",
        "Discount (SWEET20): −$3.60",
        "Delivery fee: $2.00",
        "*Total: $16.40*, cash on delivery",
        "",
        "Delivery to Mina, Port street, 3rd floor",
        "Rana · +961 70 123 456",
      ].join("\n"),
    );
  });

  it("says pickup, and leaves out what doesn't apply", () => {
    const pickup: PlacedOrder = {
      ...order,
      mode: "pickup",
      address: null,
      promoCode: null,
      totals: { subtotal: 1800, discount: 0, deliveryFee: 0, total: 1800 },
    };
    const text = orderMessage(pickup, "en", en.whatsappOrder, en.order);
    expect(text).toContain("*Total: $18.00*, pay at pickup");
    expect(text).toContain("Pickup from the shop");
    expect(text).not.toContain("Discount");
    expect(text).not.toContain("Delivery fee");
  });

  it("writes Arabic orders in Arabic", () => {
    const text = orderMessage(order, "ar", ar.whatsappOrder, ar.order);
    expect(text.split("\n")[0]).toBe("مرحبا ذا سويت سبوت! هيدا طلبي *TSS-1042* من الموقع.");
    expect(text).toContain("2 × كريب نوتيلا");
    expect(text).toContain("، الدفع كاش عند التوصيل");
    expect(text).toContain("توصيل لـ الميناء، Port street، 3rd floor");
  });

  it("opens WhatsApp with the message typed in", () => {
    expect(whatsappMessageUrl("+96171819112", "Hi & bye\n2 × crêpe")).toBe(
      "https://wa.me/96171819112?text=Hi%20%26%20bye%0A2%20%C3%97%20cr%C3%AApe",
    );
  });
});
