import "server-only";
import { unstable_cache } from "next/cache";
import { type Localized, type Menu, menu as builtInMenu } from "@/data/menu";
import { type DeliveryZone, deliveryZones, type Fulfilment, ordering } from "@/data/ordering";
import { builtInSchedule, type Ordering, type Schedule } from "@/lib/hours";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { publicClient } from "@/lib/supabase/service";
import { loadMenu, localized } from "./menu";

export { menuPhoto } from "./menu";

// What the public pages read from Supabase: the menu, the branches (hours,
// zones, the ordering switch) and the site settings. Each is cached under a tag;
// the admin revalidates the tag when it saves, and the pages that used it
// regenerate. Without Supabase (development, tests), the built-in data is used.

export const catalogTags = { menu: "menu", store: "store", settings: "settings" } as const;

/** The branch that takes online orders. */
export const ORDERING_BRANCH = "tripoli";

export type Branch = {
  slug: string;
  name: Localized;
  phone: string | null;
  mapsUrl: string | null;
  acceptsOnlineOrders: boolean;
  /** Shop hours and the ordering switch ("paused" when the branch takes no online orders). */
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
      ordering: "paused",
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
        ordering: b.accepts_online_orders ? (b.ordering as Ordering) : "paused",
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

/**
 * The public settings rows as stored. The cache keeps the rows, not the
 * parsed settings, so a new setting (or a changed default) applies at once
 * instead of waiting for a cached copy from older code to expire.
 */
async function loadSiteSettingRows(): Promise<{ key: string; value: unknown }[]> {
  const db = publicClient()!;
  const { data, error } = await db.from("site_settings").select("key, value").eq("is_public", true);
  if (error) throw new Error(`Loading the site settings failed: ${error.message}`);
  return data ?? [];
}

const cachedMenu = unstable_cache(loadMenu, ["menu"], { tags: [catalogTags.menu] });
const cachedBranches = unstable_cache(loadBranches, ["branches"], {
  tags: [catalogTags.store],
  // Closures are dated, so the schedule refreshes every few hours even without edits.
  revalidate: 6 * 3600,
});
const cachedSiteSettingRows = unstable_cache(loadSiteSettingRows, ["site-setting-rows"], {
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
export const getSiteSettings = async (): Promise<SiteSettings> =>
  parseSiteSettings(configured() ? await cachedSiteSettingRows() : []);
