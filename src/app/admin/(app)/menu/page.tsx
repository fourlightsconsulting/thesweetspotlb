import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { atLeast, requireStaff } from "@/server/admin/session";
import { categoryTree, loadCategories, loadItems } from "./data";
import { ItemList } from "./item-list";
import { MenuTabs } from "./menu-tabs";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const staff = await requireStaff();
  const canEdit = atLeast(staff.role, "manager");
  const db = await adminClient();
  const [categories, items] = await Promise.all([loadCategories(db), loadItems(db, "item")]);

  // Each category, then its headings (Drinks › Milkshakes); a category whose
  // items all sit under headings shows only those.
  const sections = categoryTree(categories).flatMap(({ top, children }) => {
    const own = items.filter((i) => i.categoryId === top.id);
    return [
      ...(own.length > 0 || children.length === 0 ? [{ category: top, items: own }] : []),
      ...children.map((heading) => ({
        category: top,
        heading,
        items: items.filter((i) => i.categoryId === heading.id),
      })),
    ];
  });

  return (
    <>
      <PageHeader
        title="Menu"
        actions={
          canEdit && (
            <Link href="/admin/menu/items/new" className="btn btn-primary">
              <Icon name="plus" className="size-4" />
              Add an item
            </Link>
          )
        }
      />
      {canEdit && <MenuTabs />}
      <ItemList sections={sections} canEdit={canEdit} editBase="/admin/menu/items" />
    </>
  );
}
