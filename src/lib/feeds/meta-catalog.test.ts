import { describe, expect, it } from "vitest";
import type { Menu } from "@/data/menu";
import { metaCatalogCsv, metaLanguageFeedCsv } from "./meta-catalog";

const photo = { src: "/_next/static/media/x.webp", width: 10, height: 10 };

const menu: Menu = {
  categories: [
    { id: "crepes", name: { en: "Crêpes", ar: "كريب" }, description: { en: "", ar: "" } },
    { id: "drinks", name: { en: "Drinks", ar: "مشروبات" }, description: { en: "", ar: "" } },
  ],
  groups: {},
  items: [
    {
      id: "lotus-crepe",
      category: "crepes",
      price: 650,
      name: { en: "Lotus Crêpe", ar: "كريب لوتس" },
      description: { en: 'Lotus spread, "biscuit" crumbs,\nand cream', ar: "" },
      image: photo,
      groups: [],
    },
    {
      id: "oreo-shake",
      category: "drinks",
      price: 500,
      name: { en: "Oreo Milkshake", ar: "ميلك شيك أوريو" },
      description: { en: "", ar: "" },
      image: photo,
      groups: [],
      available: false,
    },
    {
      id: "no-photo",
      category: "crepes",
      price: 400,
      name: { en: "No Photo", ar: "" },
      description: { en: "", ar: "" },
      groups: [],
    },
  ],
};

const opts = { siteUrl: "https://thesweetspotlb.com", brand: "The Sweet Spot" };

describe("Meta catalog feed", () => {
  it("lists items with photos, quoted where needed", () => {
    const lines = metaCatalogCsv(menu, opts).trim().split("\n");
    expect(lines[0]).toBe(
      "id,title,description,availability,condition,price,link,image_link,brand,google_product_category,product_type",
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      'lotus-crepe,Lotus Crêpe,"Lotus spread, ""biscuit"" crumbs, and cream",in stock,new,6.50 USD,https://thesweetspotlb.com/en/order?item=lotus-crepe,https://thesweetspotlb.com/feeds/photos/lotus-crepe.jpg,The Sweet Spot,"Food, Beverages & Tobacco > Food Items",Crêpes',
    );
    // Sold out stays listed; drinks are beverages; no description falls back to the name.
    expect(lines[2]).toContain(
      "oreo-shake,Oreo Milkshake,Oreo Milkshake,out of stock,new,5.00 USD",
    );
    expect(lines[2]).toContain('"Food, Beverages & Tobacco > Beverages"');
  });

  it("has an Arabic language feed", () => {
    const lines = metaLanguageFeedCsv(menu, opts).trim().split("\n");
    expect(lines[0]).toBe("id,override,title,description,link");
    expect(lines[1]).toBe(
      "lotus-crepe,ar_AR,كريب لوتس,كريب لوتس,https://thesweetspotlb.com/ar/order?item=lotus-crepe",
    );
  });
});
