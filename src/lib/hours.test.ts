import { describe, expect, it } from "vitest";
import { formatClock, storeStatus } from "./hours";

// Tripoli hours: Mon–Thu 12 pm – 12 am, Fri–Sun 12 pm – 1 am. October 2026 is
// UTC+3 in Beirut, so 10:00 UTC is 1 pm there.
const at = (iso: string) => new Date(iso);

describe("storeStatus", () => {
  it("is open in the afternoon", () => {
    expect(storeStatus(at("2026-10-06T10:00:00Z"))).toEqual({ open: true, closesAt: 1440 });
  });

  it("opens later the same day in the morning", () => {
    expect(storeStatus(at("2026-10-06T06:00:00Z"))).toEqual({
      open: false,
      opensAt: 720,
      opensTomorrow: false,
    });
  });

  it("stops online orders shortly before closing", () => {
    // Tuesday 11:50 pm with orders stopping 15 minutes before midnight.
    expect(storeStatus(at("2026-10-06T20:50:00Z"), 15)).toEqual({
      open: false,
      opensAt: 720,
      opensTomorrow: true,
    });
    expect(storeStatus(at("2026-10-06T20:40:00Z"), 15).open).toBe(true);
  });

  it("stays open past midnight on a 1 am night", () => {
    // Saturday's late session, at 12:30 am on Sunday.
    expect(storeStatus(at("2026-10-10T21:30:00Z"), 15)).toEqual({ open: true, closesAt: 60 });
    // 12:50 am: past the last-order time; Sunday opens at noon.
    expect(storeStatus(at("2026-10-10T21:50:00Z"), 15)).toEqual({
      open: false,
      opensAt: 720,
      opensTomorrow: false,
    });
  });
});

describe("formatClock", () => {
  it("writes times like the opening hours copy", () => {
    expect(formatClock(720, "en")).toBe("12 pm");
    expect(formatClock(1435, "en")).toBe("11:55 pm");
    expect(formatClock(1500, "en")).toBe("1 am");
    expect(formatClock(1155, "ar")).toBe("7:15 م");
  });
});
