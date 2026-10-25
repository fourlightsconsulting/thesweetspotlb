import { describe, expect, it } from "vitest";
import { parseStoreSettings, type StoreDraft } from "./store-settings";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const draft = (): StoreDraft => ({
  branchId: id(1),
  ordering: "hours",
  pickupMin: "10",
  pickupMax: "15",
  deliveryMin: "30",
  deliveryMax: "45",
  zones: [
    { id: id(2), name: "Zone A", fee: "2.50" },
    { id: id(3), name: "Zone B", fee: "0.00" },
  ],
  areas: [{ id: id(4), zoneId: id(2), nameEn: "Mina", nameAr: "الميناء", active: true }],
  hours: [
    {
      branchId: id(1),
      branchName: "Tripoli",
      lastOrderMinutes: "15",
      week: Array.from({ length: 7 }, () => ({ open: true, opens: "12:00", closes: "00:00" })),
    },
  ],
  closures: [],
  removedZoneIds: [],
  removedAreaIds: [],
  removedClosureIds: [],
  alerts: null,
});

describe("Store page draft", () => {
  it("converts zone fees to cents and validates the whole draft before saving", () => {
    const result = parseStoreSettings(draft());
    expect(result.ok && result.value.zones.map((zone) => zone.fee)).toEqual([250, 0]);
    expect(result.ok && result.value.pickupMin).toBe(10);
  });
  it("rejects a blank fee, negative fees and fractions of a cent", () => {
    for (const fee of ["", "-1", "1.001"]) {
      const value = draft();
      value.zones[0].fee = fee;
      expect(parseStoreSettings(value).ok).toBe(false);
    }
  });
  it("rejects duplicate zone names, including case and surrounding spaces", () => {
    const value = draft();
    value.zones[1].name = " zone a ";
    expect(parseStoreSettings(value)).toMatchObject({
      ok: false,
      error: "Give every delivery zone a different name.",
    });
  });
  it("allows moving an area to another zone and removing the old empty zone in one save", () => {
    const value = draft();
    value.areas[0].zoneId = id(3);
    value.zones.shift();
    value.removedZoneIds = [id(2)];
    expect(parseStoreSettings(value).ok).toBe(true);
  });
  it("refuses to remove a zone that still has areas", () => {
    const value = draft();
    value.zones.shift();
    value.removedZoneIds = [id(2)];
    expect(parseStoreSettings(value).ok).toBe(false);
  });
  it("refuses duplicate records and records marked both kept and removed", () => {
    const value = draft();
    value.areas.push({ ...value.areas[0] });
    expect(parseStoreSettings(value).ok).toBe(false);
    const removed = draft();
    removed.removedAreaIds = [id(4)];
    expect(parseStoreSettings(removed).ok).toBe(false);
  });
  it("checks ranges and opening hours before any database write", () => {
    const value = draft();
    value.pickupMax = "5";
    expect(parseStoreSettings(value).ok).toBe(false);
    const hours = draft();
    hours.hours[0].week[0].closes = "12:00";
    expect(parseStoreSettings(hours).ok).toBe(false);
  });
  it("normalises and deduplicates alert phones as part of the same save", () => {
    const value = draft();
    value.alerts = { enabled: true, phones: "71 234 567\n+96171234567" };
    const result = parseStoreSettings(value);
    expect(result.ok && result.value.alerts).toEqual({ enabled: true, phones: ["+96171234567"] });
  });
});
