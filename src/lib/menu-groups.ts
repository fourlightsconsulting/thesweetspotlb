import type { Category, MenuItem } from "@/data/menu";

/** Keep parent items visible alongside any headings added in the admin. */
export function groupMenuItems(category: Category, items: MenuItem[]) {
  const headings = category.subcategories ?? [];
  const headingIds = new Set(headings.map((sub) => sub.id));
  return [
    { sub: null, items: items.filter((item) => !headingIds.has(item.subcategory ?? "")) },
    ...headings.map((sub) => ({ sub, items: items.filter((item) => item.subcategory === sub.id) })),
  ].filter((group) => group.items.length > 0);
}
