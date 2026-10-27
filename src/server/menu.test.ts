import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSelections, defaultSelections } from "@/lib/pricing";
import * as service from "@/lib/supabase/service";
import { loadMenu } from "./menu";

afterEach(() => vi.restoreAllMocks());

function mockMenu(defaults: string[], min = 0, max = 3) {
  const labels = { name_en: "Dessert", name_ar: "حلو", description_en: "", description_ar: "" };
  const rows: Record<string, unknown[]> = {
    categories: [
      { ...labels, id: "category", slug: "desserts", parent_id: null, image_path: null },
    ],
    products: [
      {
        ...labels,
        id: "item",
        slug: "crepe",
        kind: "item",
        category_id: "category",
        price_cents: 500,
        is_available: true,
      },
      {
        ...labels,
        id: "bundle",
        slug: "box",
        kind: "bundle",
        category_id: "category",
        price_cents: 1000,
        is_available: true,
      },
    ],
    option_groups: [
      {
        ...labels,
        id: "group",
        key: "toppings",
        kind: "options",
        min_select: min,
        max_select: max,
      },
      { ...labels, id: "slot", key: "dessert", kind: "items", source_category_id: null },
    ],
    // The database query has already excluded sold-out and deleted options.
    options: [
      { ...labels, key: "available", group_id: "group", price_cents: 100, product_id: null },
      { ...labels, key: "crepe-pick", group_id: "slot", price_cents: 0, product_id: "item" },
    ],
    product_option_groups: [
      { product_id: "item", group_id: "group", default_options: defaults },
      { product_id: "bundle", group_id: "slot", default_options: [] },
    ],
  };
  const from = vi.fn((table: string) => {
    const result = Promise.resolve({ data: rows[table], error: null });
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), then: result.then.bind(result) };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    return query;
  });
  vi.spyOn(service, "publicClient").mockReturnValue({ from } as unknown as NonNullable<
    ReturnType<typeof service.publicClient>
  >);
}

describe("live menu defaults", () => {
  it("drops unavailable and deleted defaults while retaining available selections", async () => {
    mockMenu(["sold-out", "available", "deleted"]);
    const menu = await loadMenu();
    const item = menu.items.find((i) => i.id === "crepe")!;
    expect(item.defaults).toEqual({ toppings: ["available"] });
    expect(checkSelections(item, menu, defaultSelections(item, menu)).ok).toBe(true);
  });

  it("lets customers replace a sold-out required default with an available option", async () => {
    mockMenu(["sold-out"], 1, 1);
    const menu = await loadMenu();
    const item = menu.items.find((i) => i.id === "crepe")!;
    expect(defaultSelections(item, menu)).toEqual({ toppings: [] });
    expect(checkSelections(item, menu, { toppings: ["available"] }).ok).toBe(true);
  });

  it("also removes invisible defaults from items picked inside a bundle", async () => {
    mockMenu(["sold-out", "available"]);
    const menu = await loadMenu();
    const bundle = menu.items.find((i) => i.id === "box")!;
    const selections = defaultSelections(bundle, menu);
    expect(selections).toEqual({ dessert: ["crepe"], "dessert/toppings": ["available"] });
    expect(checkSelections(bundle, menu, selections).ok).toBe(true);
  });
});
