import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

// Shared by the menu and bundle actions: checking an item's fields, free
// slugs, uploaded photos and ordering.

type Db = SupabaseClient<Database>;

export const text = (max: number) => z.string().trim().max(max);
export const name = z.string().trim().min(1).max(80);
export const dollars = z.coerce
  .number()
  .min(0)
  .max(10_000)
  .transform((d) => Math.round(d * 100));
export const checkbox = (form: FormData, key: string) => form.get(key) === "on";

/** A free slug: `base`, or `base-2`, `base-3`… */
export async function freeSlug(
  db: Db,
  table: "products" | "categories" | "option_groups",
  column: "slug" | "key",
  base: string,
) {
  const { data } = await db
    .from(table)
    .select(column)
    .like(column, `${base}%`)
    .returns<Record<string, string>[]>();
  const taken = new Set((data ?? []).map((row) => row[column]));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Deletes an uploaded photo; bundled photos (plain file names) stay. */
export async function removeUpload(db: Db, path: string | null | undefined) {
  if (path?.includes("/")) await db.storage.from("menu").remove([path]);
}

export const imagePath = z
  .string()
  .regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*\.(webp|jpg|png|avif)$/)
  .nullable();

/** Swaps a row with its neighbour and renumbers the list (10, 20, 30…). */
export async function swapOrder(
  db: Db,
  table: "products" | "categories" | "options",
  rows: { id: string }[],
  id: string,
  direction: "up" | "down",
) {
  const list = rows.map((r) => r.id);
  const from = list.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= list.length) return true;
  [list[from], list[to]] = [list[to], list[from]];
  const results = await Promise.all(
    list.map((rowId, i) =>
      db
        .from(table)
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", rowId),
    ),
  );
  return results.every((r) => !r.error);
}

/**
 * The fields every menu item and bundle has, from its form: names,
 * descriptions, category, price, tag, photo and the three switches.
 */
export function parseItemBasics(form: FormData) {
  const parsed = z
    .object({
      id: z.uuid().optional(),
      nameEn: name,
      nameAr: name,
      descriptionEn: text(300),
      descriptionAr: text(300),
      categoryId: z.uuid(),
      price: dollars,
      tag: z.enum(["", "fav", "new", "limited"]),
      imagePath,
    })
    .safeParse({
      id: form.get("id") || undefined,
      nameEn: form.get("nameEn"),
      nameAr: form.get("nameAr"),
      descriptionEn: form.get("descriptionEn") ?? "",
      descriptionAr: form.get("descriptionAr") ?? "",
      categoryId: form.get("categoryId"),
      price: form.get("price"),
      tag: form.get("tag") ?? "",
      imagePath: form.get("imagePath") || null,
    });
  if (!parsed.success) return null;
  const v = parsed.data;
  return {
    id: v.id,
    nameEn: v.nameEn,
    categoryId: v.categoryId,
    imagePath: v.imagePath,
    fields: {
      name_en: v.nameEn,
      name_ar: v.nameAr,
      description_en: v.descriptionEn,
      description_ar: v.descriptionAr,
      category_id: v.categoryId,
      price_cents: v.price,
      tag: v.tag || null,
      image_path: v.imagePath,
      is_active: checkbox(form, "active"),
      orderable_online: checkbox(form, "online"),
      is_available: checkbox(form, "available"),
    },
  };
}
