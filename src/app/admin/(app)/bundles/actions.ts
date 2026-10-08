"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { slugify } from "@/lib/slug";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags } from "@/server/catalog";
import { failed, saved } from "@/server/admin/form-state";
import { freeSlug, name, parseItemBasics, removeUpload } from "@/server/admin/menu";
import { requireStaff } from "@/server/admin/session";

// Bundles are products of kind "bundle"; each part is a slot (an option
// group of kind "items") whose choices point at menu items, priced as the
// surcharge. A slot can also offer every item in a category, at no extra.
// Slots belong to their bundle: they're created, renamed and removed here.

const slotsSchema = z
  .array(
    z.object({
      groupId: z.uuid().optional(),
      nameEn: name,
      nameAr: name,
      choices: z
        .array(z.object({ productId: z.uuid(), surcharge: z.int().min(0).max(1_000_000) }))
        .max(60),
      sourceCategoryId: z.uuid().nullable(),
    }),
  )
  .min(1)
  .max(10);

/** The bundle's slot groups as stored now. */
async function currentSlots(db: Awaited<ReturnType<typeof adminClient>>, bundleId: string) {
  const { data } = await db
    .from("product_option_groups")
    .select("group_id, option_groups!inner(kind)")
    .eq("product_id", bundleId)
    .eq("option_groups.kind", "items");
  return new Set((data ?? []).map((l) => l.group_id));
}

export async function saveBundle(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const basics = parseItemBasics(form);
  if (!basics) return failed("Fill in both names, a category and a price.");
  let slotsInput: unknown;
  try {
    slotsInput = JSON.parse(String(form.get("slots") ?? "[]"));
  } catch {
    return failed();
  }
  const slots = slotsSchema.safeParse(slotsInput);
  if (!slots.success) return failed("Give every part a name in English and Arabic.");
  if (slots.data.some((s) => s.choices.length === 0 && !s.sourceCategoryId))
    return failed("Every part needs at least one item to pick.");
  const { fields, ...v } = basics;

  const db = await adminClient();
  let id = v.id;
  let slug: string;
  if (id) {
    const { data: before } = await db
      .from("products")
      .select("image_path, slug")
      .eq("id", id)
      .eq("kind", "bundle")
      .single();
    if (!before) return failed("That bundle wasn’t found.");
    const { error } = await db.from("products").update(fields).eq("id", id);
    if (error) return failed();
    if (before.image_path !== v.imagePath) await removeUpload(db, before.image_path);
    slug = before.slug;
  } else {
    const { data: last } = await db
      .from("products")
      .select("sort_order")
      .eq("category_id", v.categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    slug = await freeSlug(db, "products", "slug", slugify(v.nameEn, "bundle"));
    const { data, error } = await db
      .from("products")
      .insert({ ...fields, kind: "bundle", slug, sort_order: (last?.sort_order ?? 0) + 10 })
      .select("id")
      .single();
    if (error || !data) return failed();
    id = data.id;
  }

  // The items the slots point at, for the choices' keys and names.
  const productIds = [...new Set(slots.data.flatMap((s) => s.choices.map((c) => c.productId)))];
  const { data: products } = productIds.length
    ? await db.from("products").select("id, slug, name_en, name_ar, kind").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  if (productIds.some((pid) => productById.get(pid)?.kind !== "item"))
    return failed("A bundle can only contain menu items (not other bundles).");

  const existing = await currentSlots(db, id);
  const kept: string[] = [];
  for (const slot of slots.data) {
    const groupFields = {
      name_en: slot.nameEn,
      name_ar: slot.nameAr,
      source_category_id: slot.sourceCategoryId,
    };
    let groupId = slot.groupId && existing.has(slot.groupId) ? slot.groupId : undefined;
    if (groupId) {
      const { error } = await db.from("option_groups").update(groupFields).eq("id", groupId);
      if (error) return failed("The bundle saved, but its parts didn’t.");
    } else {
      const key = await freeSlug(
        db,
        "option_groups",
        "key",
        `${slug.slice(0, 24)}-${slugify(slot.nameEn, "part").slice(0, 20)}`.replace(/-+$/, ""),
      );
      const { data, error } = await db
        .from("option_groups")
        .insert({ ...groupFields, key, kind: "items", min_select: 1, max_select: 1 })
        .select("id")
        .single();
      if (error || !data) return failed("The bundle saved, but its parts didn’t.");
      groupId = data.id;
    }
    kept.push(groupId);

    // Its choices, replaced as a whole (each item once).
    const choices = slot.choices.filter(
      (c, i, all) => all.findIndex((x) => x.productId === c.productId) === i,
    );
    await db.from("options").delete().eq("group_id", groupId);
    if (choices.length > 0) {
      const { error } = await db.from("options").insert(
        choices.map((c, i) => {
          const p = productById.get(c.productId)!;
          return {
            group_id: groupId!,
            key: p.slug,
            name_en: p.name_en,
            name_ar: p.name_ar,
            price_cents: c.surcharge,
            product_id: p.id,
            sort_order: (i + 1) * 10,
          };
        }),
      );
      if (error) return failed("The bundle saved, but some of its items didn’t.");
    }
  }

  // Links in order, then remove the parts that were taken out.
  const { error: linkError } = await db
    .from("product_option_groups")
    .upsert(
      kept.map((groupId, i) => ({ product_id: id!, group_id: groupId, sort_order: (i + 1) * 10 })),
    );
  if (linkError) return failed("The bundle saved, but its parts didn’t.");
  const removed = [...existing].filter((g) => !kept.includes(g));
  if (removed.length > 0) {
    await db.from("product_option_groups").delete().eq("product_id", id).in("group_id", removed);
    await db.from("option_groups").delete().in("id", removed);
  }

  updateTag(catalogTags.menu);
  if (!v.id) redirect(`/admin/bundles/${id}?created=1`);
  return saved();
}

export async function deleteBundle(id: string): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const bundleId = z.uuid().parse(id);
  const db = await adminClient();
  const slots = await currentSlots(db, bundleId);
  const { data } = await db
    .from("products")
    .delete()
    .eq("id", bundleId)
    .eq("kind", "bundle")
    .select("image_path");
  if (!data || data.length === 0) return { error: "That didn’t save. Try again." };
  if (slots.size > 0)
    await db
      .from("option_groups")
      .delete()
      .in("id", [...slots]);
  await removeUpload(db, data[0].image_path);
  updateTag(catalogTags.menu);
  redirect("/admin/bundles");
}
