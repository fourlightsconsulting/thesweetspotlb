import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSelections, defaultSelections } from "@/lib/pricing";
import * as service from "@/lib/supabase/service";
import { loadMenu } from "./menu";

afterEach(() => vi.restoreAllMocks());

function mockMenu(defaults: string[], min = 0, max = 3, itemChoices: unknown[] = []) {
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
      {
        ...labels,
        id: "option",
        key: "available",
        group_id: "group",
        price_cents: 100,
        product_id: null,
        is_available: true,
      },
      { ...labels, key: "crepe-pick", group_id: "slot", price_cents: 0, product_id: "item" },
    ],
    product_option_groups: [
      {
        id: "link",
        product_id: "item",
        group_id: "group",
        key: "toppings",
        name_en: null,
        name_ar: null,
        min_select: null,
        max_select: null,
        default_options: defaults,
      },
      {
        id: "slot-link",
        product_id: "bundle",
        group_id: "slot",
        key: "dessert",
        name_en: null,
        name_ar: null,
        min_select: null,
        max_select: null,
        default_options: [],
      },
    ],
    product_options: itemChoices,
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

  it("never preselects more than the group allows", async () => {
    const own = {
      link_id: "link",
      option_id: null,
      key: "own-mango",
      name_en: "Mango",
      name_ar: "مانجو",
      price_cents: 200,
      is_available: true,
      is_removed: false,
      sort_order: 10,
    };
    mockMenu(["available", "own-mango"], 0, 1, [own]);
    const menu = await loadMenu();
    const item = menu.items.find((i) => i.id === "crepe")!;
    expect(item.defaults).toEqual({ toppings: ["available"] });
    expect(checkSelections(item, menu, defaultSelections(item, menu)).ok).toBe(true);
  });

  it("marks an item sold out when a required group has nothing left to pick", async () => {
    const removed = {
      link_id: "link",
      option_id: "option",
      key: "available",
      name_en: null,
      name_ar: null,
      price_cents: null,
      is_available: true,
      is_removed: true,
      sort_order: null,
    };
    mockMenu([], 1, 1, [removed]);
    const menu = await loadMenu();
    expect(menu.items.find((i) => i.id === "crepe")!.available).toBe(false);
  });

  it("shares one entry between items with identical groups", async () => {
    mockMenu([]);
    const menu = await loadMenu();
    expect(Object.keys(menu.groups)).toEqual(["toppings"]);
  });
});
