import "server-only";
import type { StaticImageData } from "next/image";
import { unstable_cache } from "next/cache";
import {
  type Category,
  type Localized,
  type Menu,
  type MenuItem,
  type OptionGroup,
  menu as builtInMenu,
} from "@/data/menu";
import { type DeliveryZone, deliveryZones, type Fulfilment, ordering } from "@/data/ordering";
import { builtInSchedule, type Schedule } from "@/lib/hours";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { storageUrl } from "@/lib/supabase/env";
import { publicClient } from "@/lib/supabase/service";

// What the public pages read from Supabase: the menu, the branches (hours,
// zones, the pause switch) and the site settings. Each is cached under a tag;
// the admin revalidates the tag when it saves, and the pages that used it
// regenerate. Without Supabase (development, tests), the built-in data is used.

export const catalogTags = { menu: "menu", store: "store", settings: "settings" } as const;

/** The branch that takes online orders. */
export const ORDERING_BRANCH = "tripoli";

/** Uploaded menu photos are cropped to this square by the admin. */
const UPLOAD_SIZE = 1200;

/** The English and Arabic columns of a text field ("name" → name_en, name_ar). */
const localized = <F extends string>(
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

function photo(path: string | null): StaticImageData | undefined {
  if (!path) return undefined;
  return (
    bundledPhotos.get(path) ?? {
      src: storageUrl("menu", path),
      width: UPLOAD_SIZE,
      height: UPLOAD_SIZE,
    }
  );
}

async function loadMenu(): Promise<Menu> {
  const db = publicClient()!;

  // Row level security returns only live categories and products.
  const [categories, products, groups, options, links] = await Promise.all([
    db.from("categories").select("*").order("sort_order"),
    db.from("products").select("*").eq("orderable_online", true).order("sort_order"),
    db.from("option_groups").select("*").eq("kind", "options"),
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
  for (const g of groups.data!) {
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

    items.push({
      id: p.slug,
      category: top.slug,
      ...(parent ? { subcategory: own.slug } : {}),
      price: p.price_cents,
      ...(p.tag ? { tag: p.tag } : {}),
      name: localized(p, "name"),
      description: localized(p, "description"),
      image: photo(p.image_path),
      groups: productLinks.map((l) => groupById.get(l.group_id)!.id),
      ...(Object.keys(defaults).length > 0 ? { defaults } : {}),
      ...(p.is_available ? {} : { available: false }),
    });
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
        image: photo(c.image_path) ?? items.find((i) => i.category === c.slug && i.image)?.image,
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

export type Branch = {
  slug: string;
  name: Localized;
  phone: string | null;
  mapsUrl: string | null;
  acceptsOnlineOrders: boolean;
  /** Shop hours; `paused` is set when online ordering is off or paused. */
  schedule: Schedule;
  eta: Record<Fulfilment, [number, number]>;
  zones: DeliveryZone[];
};

const builtInBranches: Branch[] = [
  {
    slug: "tripoli",
    name: { en: "Tripoli", ar: "طرابلس" },
    phone: null,
    mapsUrl: null,
    acceptsOnlineOrders: true,
    schedule: builtInSchedule,
    eta: ordering.eta,
    zones: deliveryZones,
  },
  {
    slug: "kaslik",
    name: { en: "Kaslik", ar: "الكسليك" },
    phone: null,
    mapsUrl: null,
    acceptsOnlineOrders: false,
    schedule: {
      hours: Array(7).fill([780, 1440]),
      closures: [],
      lastOrderMinutes: 15,
      paused: true,
    },
    eta: ordering.eta,
    zones: [],
  },
];

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

async function loadBranches(): Promise<Branch[]> {
  const db = publicClient()!;

  const [branches, hours, closures, zones] = await Promise.all([
    db.from("branches").select("*").order("created_at"),
    db.from("branch_hours").select("*"),
    // Closures from yesterday on (yesterday's can still end a late session).
    db
      .from("branch_closures")
      .select("*")
      .gte("on_date", new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)),
    db.from("delivery_zones").select("*").order("sort_order"),
  ]);
  for (const result of [branches, hours, closures, zones]) {
    if (result.error) throw new Error(`Loading the branches failed: ${result.error.message}`);
  }

  return branches.data!.map((b) => {
    const week: Schedule["hours"] = Array(7).fill(null);
    for (const h of hours.data!) {
      if (h.branch_id !== b.id) continue;
      const open = minutesOf(h.opens_at);
      let close = minutesOf(h.closes_at);
      // At or before the opening time means after midnight.
      if (close <= open) close += 1440;
      week[h.weekday] = [open, close];
    }
    return {
      slug: b.slug,
      name: localized(b, "name"),
      phone: b.phone,
      mapsUrl: b.maps_url,
      acceptsOnlineOrders: b.accepts_online_orders,
      schedule: {
        hours: week,
        closures: closures.data!.filter((c) => c.branch_id === b.id).map((c) => c.on_date),
        lastOrderMinutes: b.last_order_minutes,
        paused: !b.accepts_online_orders || b.ordering_paused,
      },
      eta: {
        pickup: [b.pickup_eta_min, b.pickup_eta_max],
        delivery: [b.delivery_eta_min, b.delivery_eta_max],
      },
      zones: zones
        .data!.filter((z) => z.branch_id === b.id)
        .map((z) => ({ id: z.slug, name: localized(z, "name"), fee: z.fee_cents })),
    };
  });
}

async function loadSiteSettings(): Promise<SiteSettings> {
  const db = publicClient()!;
  const { data, error } = await db.from("site_settings").select("key, value").eq("is_public", true);
  if (error) throw new Error(`Loading the site settings failed: ${error.message}`);
  return parseSiteSettings(data ?? []);
}

const cachedMenu = unstable_cache(loadMenu, ["menu"], { tags: [catalogTags.menu] });
const cachedBranches = unstable_cache(loadBranches, ["branches"], {
  tags: [catalogTags.store],
  // Closures are dated, so the schedule refreshes every few hours even without edits.
  revalidate: 6 * 3600,
});
const cachedSiteSettings = unstable_cache(loadSiteSettings, ["site-settings"], {
  tags: [catalogTags.settings],
});

const configured = () => publicClient() !== null;

/** The live menu: items orderable online, in their categories. */
export const getMenu = (): Promise<Menu> =>
  configured() ? cachedMenu() : Promise.resolve(builtInMenu);

/** Every branch, with its hours, ETAs and delivery zones. */
export const getBranches = (): Promise<Branch[]> =>
  configured() ? cachedBranches() : Promise.resolve(builtInBranches);

/** The branch that takes online orders. */
export async function getOrderingBranch(): Promise<Branch> {
  const branches = await getBranches();
  return branches.find((b) => b.slug === ORDERING_BRANCH) ?? builtInBranches[0];
}

/** The home ticker, the welcome popup and other admin-edited content. */
export const getSiteSettings = (): Promise<SiteSettings> =>
  configured() ? cachedSiteSettings() : Promise.resolve(parseSiteSettings([]));
