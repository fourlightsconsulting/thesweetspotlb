import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { categoryTree, loadCategories, loadItems } from "../menu/data";
import { ItemList } from "../menu/item-list";

export const metadata: Metadata = { title: "Bundles" };

export default async function BundlesPage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [categories, bundles] = await Promise.all([loadCategories(db), loadItems(db, "bundle")]);

  const sections = categoryTree(categories)
    .flatMap(({ top, children }) => [
      { category: top, items: bundles.filter((b) => b.categoryId === top.id) },
      ...children.map((heading) => ({
        category: top,
        heading,
        items: bundles.filter((b) => b.categoryId === heading.id),
      })),
    ])
    .filter((s) => s.items.length > 0);

  return (
    <>
      <PageHeader
        title="Bundles"
        description="Boxes and combos: a price, with set parts and parts the customer picks."
        actions={
          <Link href="/admin/bundles/new" className="btn btn-primary">
            <Icon name="plus" className="size-4" />
            New bundle
          </Link>
        }
      />
      {sections.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">No bundles yet.</p>
          <p className="mt-1 text-muted">
            Make one for a box with a choice of crêpe and drink, or a set combo.
          </p>
        </div>
      ) : (
        <ItemList sections={sections} canEdit editBase="/admin/bundles" />
      )}
    </>
  );
}
