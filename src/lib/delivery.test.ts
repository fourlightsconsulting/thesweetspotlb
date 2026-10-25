import { describe, expect, it } from "vitest";
import { alphabetical } from "./alphabetical";
import { checkoutAreas } from "./delivery";

describe("checkoutAreas", () => {
  it("flattens areas with their shared zone fee and no zone names", () => {
    const zone = { fee_cents: 200, name: "Zone A" };
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
      delivery_zones: { fee_cents: 500 },
    };
    expect(checkoutAreas([row])[0].fee).toBe(500);
    row.delivery_zones = { fee_cents: 0 };
    expect(checkoutAreas([row])[0].fee).toBe(0);
  });

  it("sorts the flat area list by the displayed language, across all zones", () => {
    const rows = [
      { slug: "mina", name_en: "Mina", name_ar: "الميناء", delivery_zones: { fee_cents: 500 } },
      { slug: "tal", name_en: "Tal", name_ar: "التل", delivery_zones: { fee_cents: 200 } },
      {
        slug: "abou-samra",
        name_en: "Abou Samra",
        name_ar: "أبي سمراء",
        delivery_zones: { fee_cents: 200 },
      },
    ];
    const areas = checkoutAreas(rows);
    expect(alphabetical(areas, (area) => area.name.en, "en").map((area) => area.id)).toEqual([
      "abou-samra",
      "mina",
      "tal",
    ]);
    expect(alphabetical(areas, (area) => area.name.ar, "ar").map((area) => area.id)).toEqual([
      "abou-samra",
      "tal",
      "mina",
    ]);
    expect(areas[0].id).toBe("mina");
    expect(areas.find((area) => area.id === "mina")?.fee).toBe(500);
  });
});
