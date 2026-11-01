import { describe, expect, it } from "vitest";
import { getItem, menu, type MenuItem, type OptionGroup } from "@/data/menu";
import {
  checkSelections,
  chosenOptions,
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
    const start = defaultSelections(profiteroles, menu);
    expect(start.chocolate).toEqual([]);
    expect(checkSelections(profiteroles, menu, start)).toMatchObject({
      ok: false,
      missing: ["chocolate"],
      invalid: false,
    });
  });

  it("accepts a complete choice", () => {
    expect(checkSelections(profiteroles, menu, choice).ok).toBe(true);
  });

  it("flags unknown groups and options, duplicates and over-limit picks", () => {
    const bad = [
      { ...choice, sauce: ["caramel"] },
      { ...choice, fruit: ["mango"] },
      { ...choice, fruit: ["kiwi", "kiwi"] },
      { ...choice, chocolate: ["nutella", "dark"] },
    ];
    for (const selections of bad) {
      expect(checkSelections(profiteroles, menu, selections).invalid).toBe(true);
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
    const lookup = { items: [], groups: { two: small } };
    expect(checkSelections(item, lookup, { two: ["a", "b"] }).ok).toBe(true);
    expect(checkSelections(item, lookup, { two: ["a", "b", "c"] }).invalid).toBe(true);
  });
});

describe("prices", () => {
  it("adds every option to the base price", () => {
    // $10 + strawberries $2 + sprinkles $0.50
    expect(unitPrice(profiteroles, menu, choice)).toBe(1250);
  });

  it("describes the choices in both languages", () => {
    expect(describeSelections(profiteroles, menu, choice, "en")).toBe(
      "Nutella · Strawberries · Sprinkles",
    );
    expect(describeSelections(profiteroles, menu, choice, "ar")).toBe("نوتيلا · فريز · سبرينكلز");
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

describe("bundles", () => {
  // A box: pick a crêpe (Lotus costs $1 more), and an Oreo milkshake that's always in it.
  const box: MenuItem = {
    id: "crepe-box",
    category: "boxes",
    price: 1500,
    name: { en: "Crêpe Box", ar: "علبة كريب" },
    description: { en: "", ar: "" },
    groups: [],
    slots: [
      {
        id: "crepe",
        name: { en: "Your crêpe", ar: "الكريب" },
        choices: [
          { itemId: "nutella-crepe", price: 0 },
          { itemId: "lotus-crepe", price: 100 },
        ],
      },
      {
        id: "drink",
        name: { en: "Drink", ar: "مشروب" },
        choices: [{ itemId: "oreo-milkshake", price: 0 }],
      },
    ],
  };
  const lookup = { items: [...menu.items, box], groups: menu.groups };

  it("picks fixed parts and leaves choices to the customer", () => {
    const start = defaultSelections(box, lookup);
    expect(start.drink).toEqual(["oreo-milkshake"]);
    expect(start.crepe).toEqual([]);
    expect(checkSelections(box, lookup, start)).toMatchObject({ ok: false, missing: ["crepe"] });
  });

  it("adds the surcharge and the picked item's add-ons at their usual prices", () => {
    const selections = {
      crepe: ["lotus-crepe"],
      "crepe/fruit": ["banana"],
      "crepe/extra-chocolate": ["dark"],
      drink: ["oreo-milkshake"],
    };
    expect(checkSelections(box, lookup, selections).ok).toBe(true);
    // $15 + Lotus $1 + banana $1.50 + dark chocolate $3
    expect(unitPrice(box, lookup, selections)).toBe(2050);
    expect(describeSelections(box, lookup, selections, "en")).toBe(
      "Lotus Crêpe (Dark chocolate, Banana) · Oreo Milkshake",
    );
  });

  it("lists each pick, then its own choices, as orders store them", () => {
    const selections = {
      crepe: ["nutella-crepe"],
      "crepe/fruit": ["kiwi"],
      drink: ["oreo-milkshake"],
    };
    expect(chosenOptions(box, lookup, selections).map((o) => [o.key, o.id, o.price])).toEqual([
      ["crepe", "nutella-crepe", 0],
      ["crepe/fruit", "kiwi", 150],
      ["drink", "oreo-milkshake", 0],
    ]);
  });

  it("refuses items that aren't choices, sold-out picks and stray groups", () => {
    const soldOut = {
      items: lookup.items.map((i) => (i.id === "nutella-crepe" ? { ...i, available: false } : i)),
      groups: menu.groups,
    };
    const base = { drink: ["oreo-milkshake"] };
    expect(checkSelections(box, lookup, { ...base, crepe: ["sushi-crepe"] }).invalid).toBe(true);
    expect(checkSelections(box, soldOut, { ...base, crepe: ["nutella-crepe"] }).invalid).toBe(true);
    expect(
      checkSelections(box, lookup, { ...base, crepe: ["nutella-crepe"], "drink/fruit": ["kiwi"] })
        .invalid,
    ).toBe(true);
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
