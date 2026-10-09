import type { Menu, MenuItem } from "@/data/menu";

// The menu as a Meta catalog feed (CSV), for catalog ads and Instagram
// shopping: one row per item, its id the item's slug, the same id the pixel
// and the Conversions API send (content_ids), so Meta can match them.
// Ported from Thirty's functions/_feedMapping.ts. Items without a photo are
// left out: Meta refuses a product without an image.

export type FeedOptions = { siteUrl: string; brand: string };

const FOOD = "Food, Beverages & Tobacco > Food Items";
const DRINKS = "Food, Beverages & Tobacco > Beverages";

/** One CSV cell, quoted when it has to be. */
const cell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const line = (cells: string[]) => cells.map(cell).join(",");

/** Plain one-line text, capped. */
const plain = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);

/** The items that can be in the feed: those with a photo. */
export const feedItems = (menu: Menu) => menu.items.filter((item) => item.image);

/** The photo as a JPEG, which Meta reads (menu photos are WebP). */
export const feedPhotoUrl = (siteUrl: string, item: Pick<MenuItem, "id">) =>
  `${siteUrl}/feeds/photos/${item.id}.jpg`;

const itemLink = (siteUrl: string, lang: "en" | "ar", id: string) =>
  `${siteUrl}/${lang}/order?${new URLSearchParams({ item: id })}`;

export const catalogColumns = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "google_product_category",
  "product_type",
] as const;

export function metaCatalogCsv(menu: Menu, opts: FeedOptions) {
  const categories = new Map(menu.categories.map((c) => [c.id, c]));
  const rows = feedItems(menu).map((item) => {
    const category = categories.get(item.category);
    return line([
      item.id,
      plain(item.name.en, 150),
      plain(item.description.en || item.name.en, 5000),
      item.available === false ? "out of stock" : "in stock",
      "new",
      `${(item.price / 100).toFixed(2)} USD`,
      itemLink(opts.siteUrl, "en", item.id),
      feedPhotoUrl(opts.siteUrl, item),
      opts.brand,
      item.category === "drinks" ? DRINKS : FOOD,
      category?.name.en ?? "",
    ]);
  });
  return `${[line([...catalogColumns]), ...rows].join("\n")}\n`;
}

/**
 * The Arabic names, descriptions and links, as a language feed added to the
 * same catalog (Commerce Manager → Data sources → the feed → Add language).
 */
export function metaLanguageFeedCsv(menu: Menu, opts: FeedOptions) {
  const rows = feedItems(menu).map((item) =>
    line([
      item.id,
      "ar_AR",
      plain(item.name.ar || item.name.en, 150),
      plain(item.description.ar || item.name.ar || item.name.en, 5000),
      itemLink(opts.siteUrl, "ar", item.id),
    ]),
  );
  return `${[line(["id", "override", "title", "description", "link"]), ...rows].join("\n")}\n`;
}
