import "server-only";
import type { StaticImageData } from "next/image";
import {
  type Category,
  type Localized,
  type Menu,
  type MenuItem,
  type OptionGroup,
  menu as builtInMenu,
} from "@/data/menu";
import { storageUrl } from "@/lib/supabase/env";
import { publicClient } from "@/lib/supabase/service";

// The menu as Supabase has it, uncached. The pages read it through
// getMenu() in ./catalog, which caches it; the Meta catalog feed reads it
// here, so its route stays small (no cache machinery or settings schemas).

/** Uploaded menu photos are cropped to this square by the admin. */
const UPLOAD_SIZE = 1200;

/** The English and Arabic columns of a text field ("name" → name_en, name_ar). */
export const localized = <F extends string>(
  row: Record<`${F}_en` | `${F}_ar`, string>,
  field: F,
): Localized => ({
  en: row[`${field}_en`],
  ar: row[`${field}_ar`],
});

/** Photos shipped with the site, by file name (each item's photo is "<id>.webp"). */
const bundledPhotos = new Map<string, StaticImageData>(
  builtInMenu.items.flatMap((item) =>
    item.image ? [[`${item.id}.webp`, item.image] as const] : [],
  ),
);

/** A menu photo by its stored path: a bundled file name, or an upload in the "menu" bucket. */
export function menuPhoto(path: string | null): StaticImageData | undefined {
  if (!path) return undefined;
  return (
    bundledPhotos.get(path) ?? {
      src: storageUrl("menu", path),
      width: UPLOAD_SIZE,
      height: UPLOAD_SIZE,
    }
  );
}

export async function loadMenu(): Promise<Menu> {
  const db = publicClient()!;

  // Row level security returns only live categories and products.
  const [categories, products, groups, options, links] = await Promise.all([
    db.from("categories").select("*").order("sort_order"),
    db.from("products").select("*").eq("orderable_online", true).order("sort_order"),
    db.from("option_groups").select("*"),
    db.from("options").select("*").eq("is_available", true).order("sort_order"),
    db.from("product_option_groups").select("*").order("sort_order"),
  ]);
  for (const result of [categories, products, groups, options, links]) {
    if (result.error) throw new Error(`Loading the menu failed: ${result.error.message}`);
  }

  const categoryRows = categories.data!;
  const optionRows = options.data!;
  const linkRows = links.data!;

  const groupById = new Map<string, OptionGroup>();
  for (const g of groups.data!.filter((g) => g.kind === "options")) {
    groupById.set(g.id, {
      id: g.key,
      name: localized(g, "name"),
      min: g.min_select,
      max: g.max_select,
      options: optionRows
        .filter((o) => o.group_id === g.id)
        .map((o) => ({ id: o.key, name: localized(o, "name"), price: o.price_cents })),
    });
  }

  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
  const items: MenuItem[] = [];
  const bundles: { item: MenuItem; productId: string }[] = [];
  for (const p of products.data!) {
    const own = categoryById.get(p.category_id);
    if (!own) continue; // its category is hidden
    const parent = own.parent_id ? categoryById.get(own.parent_id) : null;
    if (own.parent_id && !parent) continue;
    const top = parent ?? own;

    const productLinks = linkRows.filter((l) => l.product_id === p.id && groupById.has(l.group_id));
    const defaults: Record<string, string[]> = {};
    for (const l of productLinks) {
      if (l.default_options.length > 0) defaults[groupById.get(l.group_id)!.id] = l.default_options;
    }

    const item: MenuItem = {
      id: p.slug,
      category: top.slug,
      ...(parent ? { subcategory: own.slug } : {}),
      price: p.price_cents,
      ...(p.tag ? { tag: p.tag } : {}),
      name: localized(p, "name"),
      description: localized(p, "description"),
      image: menuPhoto(p.image_path),
      groups: productLinks.map((l) => groupById.get(l.group_id)!.id),
      ...(Object.keys(defaults).length > 0 ? { defaults } : {}),
      ...(p.is_available ? {} : { available: false }),
    };
    items.push(item);
    if (p.kind === "bundle") bundles.push({ item, productId: p.id });
  }

  // Bundle slots, once every item is known: the slot's listed items (with
  // their surcharges), then the rest of its source category at no extra.
  const slugOfProduct = new Map(products.data!.map((p) => [p.id, p.slug]));
  const itemById = new Map(
    items.filter((i) => !bundles.some((b) => b.item === i)).map((i) => [i.id, i]),
  );
  for (const bundle of bundles) {
    bundle.item.slots = linkRows
      .filter((l) => l.product_id === bundle.productId)
      .flatMap((l) => {
        const slot = groups.data!.find((g) => g.id === l.group_id && g.kind === "items");
        if (!slot) return [];
        const listed = optionRows
          .filter((o) => o.group_id === slot.id && o.product_id)
          .map((o) => ({ itemId: slugOfProduct.get(o.product_id!) ?? "", price: o.price_cents }));
        const source = slot.source_category_id && categoryById.get(slot.source_category_id);
        const fromCategory = source
          ? [...itemById.values()]
              .filter((i) => i.category === source.slug || i.subcategory === source.slug)
              .map((i) => ({ itemId: i.id, price: 0 }))
          : [];
        const choices = [...listed, ...fromCategory].filter(
          (c, index, all) =>
            itemById.has(c.itemId) && all.findIndex((x) => x.itemId === c.itemId) === index,
        );
        return [{ id: slot.key, name: localized(slot, "name"), choices }];
      });
    // Sold out when any slot has nothing left to pick.
    const pickable = bundle.item.slots.every((slot) =>
      slot.choices.some((c) => itemById.get(c.itemId)?.available !== false),
    );
    if (!pickable) bundle.item.available = false;
  }

  const menuCategories: Category[] = categoryRows
    .filter((c) => !c.parent_id)
    .map((c) => {
      const subcategories = categoryRows
        .filter((s) => s.parent_id === c.id)
        .map((s) => ({ id: s.slug, name: localized(s, "name") }));
      return {
        id: c.slug,
        name: localized(c, "name"),
        description: localized(c, "description"),
        image:
          menuPhoto(c.image_path) ?? items.find((i) => i.category === c.slug && i.image)?.image,
        ...(subcategories.length > 0 ? { subcategories } : {}),
      };
    })
    // An empty category has nothing to show.
    .filter((c) => items.some((i) => i.category === c.id));

  return {
    categories: menuCategories,
    items,
    groups: Object.fromEntries([...groupById.values()].map((g) => [g.id, g])),
  };
}

/** The live menu without the cache, or the built-in one without Supabase. */
export const loadMenuOrBuiltIn = (): Promise<Menu> =>
  publicClient() ? loadMenu() : Promise.resolve(builtInMenu);
