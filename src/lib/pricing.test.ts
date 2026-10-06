import { describe, expect, it } from "vitest";
import { getItem, menu, type OptionGroup } from "@/data/menu";
import {
  checkSelections,
  defaultSelections,
  describeSelections,
  lineSignature,
  orderTotals,
  priceLines,
  promoDiscount,
  unitPrice,
} from "./pricing";

const profiteroles = getItem("creamy-profiteroles");
const choice = { chocolate: ["nutella"], fruit: ["strawberry"], toppings: ["sprinkles"] };

describe("selections", () => {
  it("starts required choices empty, so customers pick on purpose", () => {
    const start = defaultSelections(profiteroles, menu.groups);
    expect(start.chocolate).toEqual([]);
    expect(checkSelections(profiteroles, menu.groups, start)).toMatchObject({
      ok: false,
      missing: ["chocolate"],
      invalid: false,
    });
  });

  it("accepts a complete choice", () => {
    expect(checkSelections(profiteroles, menu.groups, choice).ok).toBe(true);
  });

  it("flags unknown groups and options, duplicates and over-limit picks", () => {
    const bad = [
      { ...choice, sauce: ["caramel"] },
      { ...choice, fruit: ["mango"] },
      { ...choice, fruit: ["kiwi", "kiwi"] },
      { ...choice, chocolate: ["nutella", "dark"] },
    ];
    for (const selections of bad) {
      expect(checkSelections(profiteroles, menu.groups, selections).invalid).toBe(true);
    }
  });

  it("caps optional groups at their max", () => {
    const small: OptionGroup = {
      id: "two",
      name: { en: "Two", ar: "Two" },
      min: 0,
      max: 2,
      options: ["a", "b", "c"].map((id) => ({ id, name: { en: id, ar: id }, price: 0 })),
    };
    const item = { ...profiteroles, groups: ["two"] };
    const groups = { two: small };
    expect(checkSelections(item, groups, { two: ["a", "b"] }).ok).toBe(true);
    expect(checkSelections(item, groups, { two: ["a", "b", "c"] }).invalid).toBe(true);
  });
});

describe("prices", () => {
  it("adds every option to the base price", () => {
    // $10 + strawberries $2 + sprinkles $0.50
    expect(unitPrice(profiteroles, menu.groups, choice)).toBe(1250);
  });

  it("describes the choices in both languages", () => {
    expect(describeSelections(profiteroles, menu.groups, choice, "en")).toBe(
      "Nutella · Strawberries · Sprinkles",
    );
    expect(describeSelections(profiteroles, menu.groups, choice, "ar")).toBe(
      "نوتيلا · فريز · سبرينكلز",
    );
  });

  it("prices lines and sets aside the ones it can't price", () => {
    const { priced, invalid, subtotal } = priceLines(
      [
        { itemId: "creamy-profiteroles", qty: 2, selections: choice },
        { itemId: "no-such-item", qty: 1, selections: {} },
        { itemId: "creamy-profiteroles", qty: 1, selections: {} },
      ],
      menu,
    );
    expect(priced).toHaveLength(1);
    expect(invalid).toHaveLength(2);
    expect(subtotal).toBe(2500);
  });

  it("treats the same choices in any order as the same line", () => {
    expect(lineSignature("x", { a: ["1", "2"], b: [] }, " hi ")).toBe(
      lineSignature("x", { a: ["2", "1"] }, "hi"),
    );
  });
});

describe("totals", () => {
  it("rounds a percentage discount to the cent", () => {
    expect(promoDiscount({ code: "X", kind: "percent", value: 20 }, 3333)).toBe(667);
  });

  it("respects a minimum subtotal and a cap", () => {
    const rule = {
      code: "X",
      kind: "percent" as const,
      value: 50,
      minSubtotal: 2000,
      maxDiscount: 500,
    };
    expect(promoDiscount(rule, 1999)).toBe(0);
    expect(promoDiscount(rule, 4000)).toBe(500);
  });

  it("never discounts more than the food costs", () => {
    expect(promoDiscount({ code: "X", kind: "amount", value: 1000 }, 600)).toBe(600);
  });

  it("charges delivery in full and skips it for an empty order", () => {
    const rule = { code: "SWEET20", kind: "percent" as const, value: 20 };
    expect(orderTotals(3750, 200, rule)).toEqual({
      subtotal: 3750,
      discount: 750,
      deliveryFee: 200,
      total: 3200,
    });
    expect(orderTotals(0, 200).total).toBe(0);
  });
});
