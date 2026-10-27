import { describe, expect, it } from "vitest";
import type { Category, MenuItem } from "@/data/menu";
import { groupMenuItems } from "./menu-groups";

const category: Category = {
  id: "drinks",
  name: { en: "Drinks", ar: "مشروبات" },
  description: { en: "", ar: "" },
};
const item = (id: string, subcategory?: string): MenuItem => ({
  id,
  category: category.id,
  subcategory,
  name: { en: id, ar: id },
  description: { en: "", ar: "" },
  price: 300,
  groups: [],
});

describe("menu headings", () => {
  it("keeps parent products visible when the admin adds headings", () => {
    const items = [item("water"), item("mango", "juice"), item("coffee", "retired-heading")];
    const groups = groupMenuItems(
      { ...category, subcategories: [{ id: "juice", name: { en: "Juice", ar: "عصير" } }] },
      items,
    );
    expect(groups.map((group) => [group.sub?.id ?? null, group.items.map((i) => i.id)])).toEqual([
      [null, ["water", "coffee"]],
      ["juice", ["mango"]],
    ]);
    expect(groups.flatMap((group) => group.items)).toHaveLength(items.length);
  });

  it("shows all items when there are no headings, including an empty heading list", () => {
    const items = [item("water"), item("mango", "juice")];
    expect(groupMenuItems(category, items)).toEqual([{ sub: null, items }]);
    expect(groupMenuItems({ ...category, subcategories: [] }, items)).toEqual([
      { sub: null, items },
    ]);
  });

  it("retains heading order and omits empty groups", () => {
    const headings = ["smoothies", "juice", "coffee"].map((id) => ({
      id,
      name: { en: id, ar: id },
    }));
    const groups = groupMenuItems({ ...category, subcategories: headings }, [
      item("mango", "juice"),
    ]);
    expect(groups.map((group) => group.sub?.id)).toEqual(["juice"]);
  });
});
