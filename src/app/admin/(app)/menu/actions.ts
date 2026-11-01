"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { groupsToSave } from "@/lib/item-groups";
import { slugify } from "@/lib/slug";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags } from "@/server/catalog";
import { failed, saved } from "@/server/admin/form-state";
import {
  checkbox,
  freeSlug,
  imagePath,
  name,
  parseItemBasics,
  removeUpload,
  setOrder,
  swapOrder,
  text,
} from "@/server/admin/menu";
import { requireStaff } from "@/server/admin/session";
import { loadTemplates } from "./data";

// The menu: items, categories and choice templates. Managers edit everything;
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

const itemGroups = z
  .array(
    z
      .object({
        key: z.string().max(80).nullable(),
        templateId: z.uuid().nullable(),
        nameEn: name,
        nameAr: name,
        min: z.int().min(0).max(20),
        max: z.int().min(1).max(20),
        defaults: z.array(z.string().max(80)).max(60),
        choices: z
          .array(
            z.object({
              key: z.string().max(80).nullable(),
              optionId: z.uuid().nullable(),
              nameEn: name,
              nameAr: name,
              price: z.int().min(0).max(1_000_000),
              available: z.boolean(),
              removed: z.boolean(),
            }),
          )
          .max(60),
      })
      .refine((g) => g.min <= g.max),
  )
  .max(20);

const parseGroups = (raw: string) => {
  try {
    return itemGroups.safeParse(JSON.parse(raw));
  } catch {
    return itemGroups.safeParse(null);
  }
};

/** Creates an item (then opens it) or saves one, with its photo and choices. */
export async function saveItem(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const basics = parseItemBasics(form);
  if (!basics) return failed("Fill in both names, a category and a price.");
  const groups = parseGroups(String(form.get("groups") ?? "[]"));
  if (!groups.success) return failed("Give every group and choice a name in both languages.");
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

  // Its groups, stored as what differs from each template.
  const templates = await loadTemplates(db);
  const { error: groupsError } = await db.rpc("save_item_groups", {
    p_product: id!,
    p_groups: groupsToSave(groups.data, new Map(templates.map((t) => [t.id, t]))),
  });
  if (groupsError) return failed("The item saved, but its choices didn’t.");

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

/** Puts a category's items in this order. */
export async function reorderItems(ids: string[]): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  return (await setOrder(db, "products", z.array(z.uuid()).max(500).parse(ids))) ? ok() : oops();
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

// ─── Choice templates (option groups and their options) ───────────────────

const templateInput = z
  .object({
    id: z.uuid().nullable(),
    nameEn: name,
    nameAr: name,
    min: z.int().min(0).max(20),
    max: z.int().min(1).max(20),
    choices: z
      .array(
        z.object({
          id: z.uuid().nullable(),
          nameEn: name,
          nameAr: name,
          price: z.int().min(0).max(1_000_000),
          available: z.boolean(),
        }),
      )
      .max(60),
  })
  .refine((t) => t.min <= t.max);

/** Creates a template (then opens it) or saves one: its rule and its whole list of choices. */
export async function saveTemplate(raw: unknown): Promise<FormState> {
  await requireStaff("manager");
  const parsed = templateInput.safeParse(raw);
  if (!parsed.success)
    return failed("Give the template and every choice a name in both languages.");
  const v = parsed.data;
  const fields = { name_en: v.nameEn, name_ar: v.nameAr, min_select: v.min, max_select: v.max };

  const db = await adminClient();
  let id = v.id;
  if (id) {
    const { error } = await db
      .from("option_groups")
      .update(fields)
      .eq("id", id)
      .eq("kind", "options");
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
    id = data.id;
  }

  const { data: current, error: loadError } = await db
    .from("options")
    .select("id, key, name_en, name_ar, price_cents, is_available, sort_order")
    .eq("group_id", id);
  if (loadError) return failed();
  const listed = new Set(v.choices.map((c) => c.id));
  const gone = current.filter((o) => !listed.has(o.id)).map((o) => o.id);
  const keys = new Set(current.map((o) => o.key));
  const writes: PromiseLike<{ error: unknown }>[] = [];
  if (gone.length > 0) writes.push(db.from("options").delete().in("id", gone));
  v.choices.forEach((c, i) => {
    const row = {
      name_en: c.nameEn,
      name_ar: c.nameAr,
      price_cents: c.price,
      is_available: c.available,
      sort_order: (i + 1) * 10,
    };
    const before = current.find((o) => o.id === c.id);
    if (before) {
      // Only what changed, so the price log and audit trail stay true.
      const same = (Object.keys(row) as (keyof typeof row)[]).every((k) => before[k] === row[k]);
      if (!same) writes.push(db.from("options").update(row).eq("id", before.id));
    } else if (!c.id) {
      const base = slugify(c.nameEn, "choice");
      let key = base;
      for (let n = 2; keys.has(key); n++) key = `${base}-${n}`;
      keys.add(key);
      writes.push(db.from("options").insert({ ...row, group_id: id!, key }));
    }
  });
  const results = await Promise.all(writes);
  if (results.some((r) => r.error)) return failed("The template saved, but some choices didn’t.");

  updateTag(catalogTags.menu);
  if (!v.id) redirect(`/admin/menu/choices/${id}?created=1`);
  return saved();
}

/** Items using it keep the group as their own (keep_template_on_items in the database). */
export async function deleteGroup(id: string): Promise<Result> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("option_groups").delete().eq("id", z.uuid().parse(id));
  if (error) return oops();
  updateTag(catalogTags.menu);
  redirect("/admin/menu/choices");
}
