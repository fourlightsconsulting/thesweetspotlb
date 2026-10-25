import { describe, expect, it } from "vitest";
import { checkoutAreas } from "./delivery";

describe("checkoutAreas", () => {
  it("flattens areas with their shared zone fee and no zone names", () => {
    const zone = { fee_cents: 200, sort_order: 10, name: "Zone A" };
    const rows = [
      { slug: "mina", name_en: "Mina", name_ar: "الميناء", delivery_zones: zone },
      { slug: "tal", name_en: "Tal", name_ar: "التل", delivery_zones: zone },
    ];
    expect(checkoutAreas(rows)).toEqual([
      { id: "mina", name: { en: "Mina", ar: "الميناء" }, fee: 200 },
      { id: "tal", name: { en: "Tal", ar: "التل" }, fee: 200 },
    ]);
    zone.fee_cents = 350;
    expect(checkoutAreas(rows).map((area) => area.fee)).toEqual([350, 350]);
  });

  it("uses the destination zone fee after moving an area, including free delivery", () => {
    const row = {
      slug: "mina",
      name_en: "Mina",
      name_ar: "الميناء",
      delivery_zones: { fee_cents: 500, sort_order: 20 },
    };
    expect(checkoutAreas([row])[0].fee).toBe(500);
    row.delivery_zones = { fee_cents: 0, sort_order: 10 };
    expect(checkoutAreas([row])[0].fee).toBe(0);
  });

  it("keeps each zone's areas together in one list without changing the source rows", () => {
    const rows = [
      {
        slug: "far",
        name_en: "Far",
        name_ar: "بعيد",
        delivery_zones: { fee_cents: 500, sort_order: 20 },
      },
      {
        slug: "near-1",
        name_en: "Near 1",
        name_ar: "قريب",
        delivery_zones: { fee_cents: 200, sort_order: 10 },
      },
      {
        slug: "near-2",
        name_en: "Near 2",
        name_ar: "قريب",
        delivery_zones: { fee_cents: 200, sort_order: 10 },
      },
    ];
    expect(checkoutAreas(rows).map((area) => area.id)).toEqual(["near-1", "near-2", "far"]);
    expect(rows[0].slug).toBe("far");
  });
});
