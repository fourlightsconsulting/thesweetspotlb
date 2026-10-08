import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { categoryTree, loadCategories } from "../data";
import { MenuTabs } from "../menu-tabs";
import { CategoryRow, NewCategory } from "./category-forms";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [categories, products] = await Promise.all([
    loadCategories(db),
    db.from("products").select("category_id"),
  ]);
  const count = (id: string) => (products.data ?? []).filter((p) => p.category_id === id).length;
  const tree = categoryTree(categories);
  const parents = tree.map(({ top }) => ({ id: top.id, nameEn: top.nameEn }));

  return (
    <>
      <PageHeader
        title="Menu"
        description="Categories are the menu’s tabs; headings group items inside one (Drinks › Milkshakes)."
      />
      <MenuTabs />
      <div className="mb-4">
        <NewCategory parents={parents} />
      </div>
      <ul className="flex flex-col gap-2">
        {tree.flatMap(({ top, children }, i) => [
          <CategoryRow
            key={top.id}
            category={top}
            parents={parents}
            itemCount={count(top.id)}
            first={i === 0}
            last={i === tree.length - 1}
          />,
          ...children.map((child, j) => (
            <CategoryRow
              key={child.id}
              category={child}
              parents={parents}
              itemCount={count(child.id)}
              first={j === 0}
              last={j === children.length - 1}
            />
          )),
        ])}
      </ul>
    </>
  );
}
