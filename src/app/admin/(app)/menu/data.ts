import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { menuPhoto } from "@/server/catalog";

// The menu as the admin sees it: every category and product, hidden ones
// included (row level security shows staff everything).

export type AdminCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  parentId: string | null;
  imagePath: string | null;
  imageSrc: string | null;
  active: boolean;
};

export type AdminItem = {
  id: string;
  slug: string;
  kind: "item" | "bundle";
  nameEn: string;
  categoryId: string;
  price: number;
  tag: "fav" | "new" | "limited" | null;
  active: boolean;
  available: boolean;
  online: boolean;
  imageSrc: string | null;
};

/** Where a stored photo path is served from (bundled file or upload). */
export const photoSrc = (path: string | null) => menuPhoto(path)?.src ?? null;

export async function loadCategories(db: SupabaseClient<Database>): Promise<AdminCategory[]> {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name_en");
  if (error) throw new Error(`Loading the categories failed: ${error.message}`);
  return data.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameEn: c.name_en,
    nameAr: c.name_ar,
    descriptionEn: c.description_en,
    descriptionAr: c.description_ar,
    parentId: c.parent_id,
    imagePath: c.image_path,
    imageSrc: photoSrc(c.image_path),
    active: c.is_active,
  }));
}

export async function loadItems(
  db: SupabaseClient<Database>,
  kind: "item" | "bundle",
): Promise<AdminItem[]> {
  const { data, error } = await db
    .from("products")
    .select(
      "id, slug, kind, name_en, category_id, price_cents, tag, is_active, is_available, orderable_online, image_path",
    )
    .eq("kind", kind)
    .order("sort_order")
    .order("name_en");
  if (error) throw new Error(`Loading the menu failed: ${error.message}`);
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    kind: p.kind,
    nameEn: p.name_en,
    categoryId: p.category_id,
    price: p.price_cents,
    tag: p.tag,
    active: p.is_active,
    available: p.is_available,
    online: p.orderable_online,
    imageSrc: photoSrc(p.image_path),
  }));
}

/** Categories in menu order: each top-level one followed by its headings. */
export function categoryTree(categories: AdminCategory[]) {
  return categories
    .filter((c) => !c.parentId)
    .map((top) => ({ top, children: categories.filter((c) => c.parentId === top.id) }));
}

/** "Drinks › Milkshakes", for selects and labels. */
export function categoryLabel(categories: AdminCategory[], id: string) {
  const category = categories.find((c) => c.id === id);
  if (!category) return "";
  const parent = categories.find((c) => c.id === category.parentId);
  return parent ? `${parent.nameEn} › ${category.nameEn}` : category.nameEn;
}
