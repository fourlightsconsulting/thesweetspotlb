"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { slugify } from "@/lib/slug";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags } from "@/server/catalog";
import { failed, saved } from "@/server/admin/form-state";
import {
  checkbox,
  dollars,
  freeSlug,
  imagePath,
  name,
  parseItemBasics,
  removeUpload,
  swapOrder,
  text,
} from "@/server/admin/menu";
import { requireStaff } from "@/server/admin/session";

// The menu: items, categories and their choices. Managers edit everything;
// staff only mark items and choices sold out (the database allows them
// nothing else). Every save refreshes the public menu (the "menu" tag).

type Result = { error: string | null };

const ok = (): Result => {
  updateTag(catalogTags.menu);
  return { error: null };
};
const oops = (message = "That didn’t save. Try again."): Result => ({ error: message });

// ─── Sold out (staff) ─────────────────────────────────────────────────────

export async function setItemAvailable(id: string, available: boolean): Promise<Result> {
  await requireStaff();
  const db = await adminClient();
  const { error } = await db
    .from("products")
    .update({ is_available: available })
    .eq("id", z.uuid().parse(id));
  return error ? oops() : ok();
}

export async function setChoiceAvailable(id: string, available: boolean): Promise<Result> {
  await requireStaff();
  const db = await adminClient();
  const { error } = await db
    .from("options")
    .update({ is_available: available })
    .eq("id", z.uuid().parse(id));
  return error ? oops() : ok();
}

// ─── Items ────────────────────────────────────────────────────────────────

const attachedGroups = z
  .array(z.object({ groupId: z.uuid(), defaults: z.array(z.string().max(60)).max(20) }))
  .max(20);

/** Creates an item (then opens it) or saves one, with its photo and choices. */
export async function saveItem(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const basics = parseItemBasics(form);
  if (!basics) return failed("Fill in both names, a category and a price.");
  const groups = attachedGroups.safeParse(JSON.parse(String(form.get("groups") ?? "[]")));
  if (!groups.success) return failed();
  const { fields, ...v } = basics;

  const db = await adminClient();
  let id = v.id;
  if (id) {
    const { data: before } = await db.from("products").select("image_path").eq("id", id).single();
    const { error } = await db.from("products").update(fields).eq("id", id);
    if (error) return failed();
    if (before?.image_path !== v.imagePath) await removeUpload(db, before?.image_path);
  } else {
    const { data: last } = await db
      .from("products")
      .select("sort_order")
      .eq("category_id", v.categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await db
      .from("products")
      .insert({
        ...fields,
        kind: "item",
        slug: await freeSlug(db, "products", "slug", slugify(v.nameEn)),
        sort_order: (last?.sort_order ?? 0) + 10,
      })
      .select("id")
      .single();
    if (error || !data) return failed();
    id = data.id;
  }

  // Choices: exactly the listed groups, in this order.
  const keep = groups.data.map((g) => g.groupId);
  const removed = db.from("product_option_groups").delete().eq("product_id", id);
  const { error: removeError } = await (keep.length > 0
    ? removed.not("group_id", "in", `(${keep.join(",")})`)
    : removed);
  const { error: upsertError } =
    keep.length > 0
      ? await db.from("product_option_groups").upsert(
          groups.data.map((g, i) => ({
            product_id: id,
            group_id: g.groupId,
            sort_order: (i + 1) * 10,
            default_options: g.defaults,
          })),
        )
      : { error: null };
  if (removeError || upsertError) return failed("The item saved, but its choices didn’t.");

  updateTag(catalogTags.menu);
  if (!v.id) redirect(`/admin/menu/items/${id}?created=1`);
  return saved();
}

export async function deleteItem(id: string): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { data } = await db
    .from("products")
    .delete()
    .eq("id", z.uuid().parse(id))
    .select("image_path");
  if (!data || data.length === 0) return oops();
  await removeUpload(db, data[0].image_path);
  updateTag(catalogTags.menu);
  redirect("/admin/menu");
}

/** Moves an item one place up or down within its category. */
export async function moveItem(id: string, direction: "up" | "down"): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { data: item } = await db
    .from("products")
    .select("category_id")
    .eq("id", z.uuid().parse(id))
    .single();
  if (!item) return oops();
  const { data: siblings } = await db
    .from("products")
    .select("id")
    .eq("category_id", item.category_id)
    .order("sort_order")
    .order("name_en");
  return (await swapOrder(db, "products", siblings ?? [], id, direction)) ? ok() : oops();
}

// ─── Categories ───────────────────────────────────────────────────────────

export async function saveCategory(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const parsed = z
    .object({
      id: z.uuid().optional(),
      nameEn: name,
      nameAr: name,
      descriptionEn: text(200),
      descriptionAr: text(200),
      parentId: z.uuid().nullable(),
      imagePath,
    })
    .safeParse({
      id: form.get("id") || undefined,
      nameEn: form.get("nameEn"),
      nameAr: form.get("nameAr"),
      descriptionEn: form.get("descriptionEn") ?? "",
      descriptionAr: form.get("descriptionAr") ?? "",
      parentId: form.get("parentId") || null,
      imagePath: form.get("imagePath") || null,
    });
  if (!parsed.success) return failed("Give the category a name in English and Arabic.");
  const v = parsed.data;
  if (v.id && v.parentId === v.id) return failed("A category can’t sit inside itself.");

  const fields = {
    name_en: v.nameEn,
    name_ar: v.nameAr,
    description_en: v.descriptionEn,
    description_ar: v.descriptionAr,
    parent_id: v.parentId,
    image_path: v.imagePath,
    is_active: checkbox(form, "active"),
  };
  const db = await adminClient();
  // One level only: a heading sits under a tab, never under another heading.
  if (v.parentId) {
    const [{ data: parent }, { count }] = await Promise.all([
      db.from("categories").select("parent_id").eq("id", v.parentId).single(),
      v.id
        ? db.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", v.id)
        : Promise.resolve({ count: 0 }),
    ]);
    if (parent?.parent_id)
      return failed("Headings sit under a menu tab, not under another heading.");
    if (count) return failed("This category has headings of its own, so it stays a menu tab.");
  }
  if (v.id) {
    const { data: before } = await db
      .from("categories")
      .select("image_path")
      .eq("id", v.id)
      .single();
    const { error } = await db.from("categories").update(fields).eq("id", v.id);
    if (error) return failed();
    if (before?.image_path !== v.imagePath) await removeUpload(db, before?.image_path);
  } else {
    const { data: last } = await db
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db.from("categories").insert({
      ...fields,
      is_active: true,
      slug: await freeSlug(db, "categories", "slug", slugify(v.nameEn, "category")),
      sort_order: (last?.sort_order ?? 0) + 10,
    });
    if (error) return failed();
  }
  updateTag(catalogTags.menu);
  return saved();
}

export async function deleteCategory(id: string): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { data, error } = await db
    .from("categories")
    .delete()
    .eq("id", z.uuid().parse(id))
    .select("image_path");
  if (error)
    return oops(
      error.code === "23503"
        ? "It still has items, headings or bundle slots. Move or delete those first."
        : undefined,
    );
  await removeUpload(db, data?.[0]?.image_path);
  return ok();
}

/** Moves a category one place up or down among its siblings. */
export async function moveCategory(id: string, direction: "up" | "down"): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { data: category } = await db
    .from("categories")
    .select("parent_id")
    .eq("id", z.uuid().parse(id))
    .single();
  if (!category) return oops();
  const siblings = db.from("categories").select("id").order("sort_order").order("name_en");
  const { data } = await (category.parent_id
    ? siblings.eq("parent_id", category.parent_id)
    : siblings.is("parent_id", null));
  return (await swapOrder(db, "categories", data ?? [], id, direction)) ? ok() : oops();
}

// ─── Choices (option groups and their options) ────────────────────────────

/** A group of choices: its names and rule (required or optional, up to how many). */
export async function saveGroup(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const parsed = z
    .object({
      id: z.uuid().optional(),
      nameEn: name,
      nameAr: name,
      max: z.coerce.number().int().min(1).max(20),
    })
    .safeParse({
      id: form.get("id") || undefined,
      nameEn: form.get("nameEn"),
      nameAr: form.get("nameAr"),
      max: form.get("max"),
    });
  if (!parsed.success) return failed("Give the group a name in both languages and a limit.");
  const v = parsed.data;
  const min = checkbox(form, "required") ? 1 : 0;
  const fields = { name_en: v.nameEn, name_ar: v.nameAr, min_select: min, max_select: v.max };

  const db = await adminClient();
  if (v.id) {
    const { error } = await db.from("option_groups").update(fields).eq("id", v.id);
    if (error) return failed();
  } else {
    const { data, error } = await db
      .from("option_groups")
      .insert({
        ...fields,
        kind: "options",
        key: await freeSlug(db, "option_groups", "key", slugify(v.nameEn, "choices")),
      })
      .select("id")
      .single();
    if (error || !data) return failed();
    updateTag(catalogTags.menu);
    redirect(`/admin/menu/choices#group-${data.id}`);
  }
  updateTag(catalogTags.menu);
  return saved();
}

export async function deleteGroup(id: string): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("option_groups").delete().eq("id", z.uuid().parse(id));
  if (error)
    return oops(
      error.code === "23503"
        ? "Items still use these choices. Take them off those items first."
        : undefined,
    );
  return ok();
}

/** Adds a choice to a group, or changes one (with `id`). */
export async function saveChoice(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const parsed = z
    .object({
      id: z.uuid().optional(),
      groupId: z.uuid(),
      nameEn: name,
      nameAr: name,
      price: dollars,
    })
    .safeParse({
      id: form.get("id") || undefined,
      groupId: form.get("groupId"),
      nameEn: form.get("nameEn"),
      nameAr: form.get("nameAr"),
      price: form.get("price") || 0,
    });
  if (!parsed.success) return failed("Give the choice a name in both languages.");
  const v = parsed.data;
  const fields = { name_en: v.nameEn, name_ar: v.nameAr, price_cents: v.price };

  const db = await adminClient();
  if (v.id) {
    const { error } = await db
      .from("options")
      .update({ ...fields, is_available: checkbox(form, "available") })
      .eq("id", v.id);
    if (error) return failed();
  } else {
    const [{ data: taken }, { data: last }] = await Promise.all([
      db.from("options").select("key").eq("group_id", v.groupId),
      db
        .from("options")
        .select("sort_order")
        .eq("group_id", v.groupId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const keys = new Set((taken ?? []).map((o) => o.key));
    const base = slugify(v.nameEn, "choice");
    let key = base;
    for (let n = 2; keys.has(key); n++) key = `${base}-${n}`;
    const { error } = await db.from("options").insert({
      ...fields,
      group_id: v.groupId,
      key,
      sort_order: (last?.sort_order ?? 0) + 10,
    });
    if (error) return failed();
  }
  updateTag(catalogTags.menu);
  return saved();
}

export async function deleteChoice(id: string): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("options").delete().eq("id", z.uuid().parse(id));
  return error ? oops() : ok();
}

/** Moves a choice one place up or down in its group. */
export async function moveChoice(id: string, direction: "up" | "down"): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { data: choice } = await db
    .from("options")
    .select("group_id")
    .eq("id", z.uuid().parse(id))
    .single();
  if (!choice) return oops();
  const { data } = await db
    .from("options")
    .select("id")
    .eq("group_id", choice.group_id)
    .order("sort_order")
    .order("name_en");
  return (await swapOrder(db, "options", data ?? [], id, direction)) ? ok() : oops();
}
