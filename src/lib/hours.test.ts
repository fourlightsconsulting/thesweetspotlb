import { describe, expect, it } from "vitest";
import ar from "@/i18n/dictionaries/ar";
import en from "@/i18n/dictionaries/en";
import { builtInSchedule, formatClock, type Schedule, storeStatus, weekHours } from "./hours";

// Tripoli hours: Mon–Thu 12 pm – 12 am, Fri–Sun 12 pm – 1 am. October 2026 is
// UTC+3 in Beirut, so 10:00 UTC is 1 pm there.
const at = (iso: string) => new Date(iso);
const shop: Schedule = { ...builtInSchedule, lastOrderMinutes: 0 };
const online: Schedule = { ...builtInSchedule, lastOrderMinutes: 15 };

describe("storeStatus", () => {
  it("is open in the afternoon", () => {
    expect(storeStatus(shop, at("2026-10-06T10:00:00Z"))).toEqual({ open: true, closesAt: 1440 });
  });

  it("opens later the same day in the morning", () => {
    expect(storeStatus(shop, at("2026-10-06T06:00:00Z"))).toEqual({
      open: false,
      reopens: { inDays: 0, at: 720 },
    });
  });

  it("stops online orders shortly before closing", () => {
    // Tuesday 11:50 pm with orders stopping 15 minutes before midnight.
    expect(storeStatus(online, at("2026-10-06T20:50:00Z"))).toEqual({
      open: false,
      reopens: { inDays: 1, at: 720 },
    });
    expect(storeStatus(online, at("2026-10-06T20:40:00Z")).open).toBe(true);
  });

  it("stays open past midnight on a 1 am night", () => {
    // Saturday's late session, at 12:30 am on Sunday.
    expect(storeStatus(online, at("2026-10-10T21:30:00Z"))).toEqual({ open: true, closesAt: 60 });
    // 12:50 am: past the last-order time; Sunday opens at noon.
    expect(storeStatus(online, at("2026-10-10T21:50:00Z"))).toEqual({
      open: false,
      reopens: { inDays: 0, at: 720 },
    });
  });

  it("skips closure days, including their late session", () => {
    const closed = { ...online, closures: ["2026-10-06", "2026-10-07"] };
    // Tuesday 3 pm, closed Tuesday and Wednesday: back on Thursday at noon.
    expect(storeStatus(closed, at("2026-10-06T12:00:00Z"))).toEqual({
      open: false,
      reopens: { inDays: 2, at: 720 },
    });
    // Saturday closed: no late session at 12:30 am on Sunday either.
    expect(
      storeStatus({ ...online, closures: ["2026-10-10"] }, at("2026-10-10T21:30:00Z")).open,
    ).toBe(false);
  });

  it("takes nothing while paused", () => {
    expect(storeStatus({ ...online, paused: true }, at("2026-10-06T12:00:00Z"))).toEqual({
      open: false,
      reopens: null,
    });
  });

  it("finds the next open day across closed weekdays", () => {
    const weekends: Schedule = {
      ...shop,
      hours: [[720, 1440], null, null, null, null, null, [720, 1440]],
    };
    // Tuesday: next open is Saturday.
    expect(storeStatus(weekends, at("2026-10-06T12:00:00Z"))).toEqual({
      open: false,
      reopens: { inDays: 4, at: 720 },
    });
  });
});

describe("weekHours", () => {
  it("groups days that share hours, Monday first, as the shop writes them", () => {
    expect(weekHours(builtInSchedule, "en", en.locations)).toEqual([
      { days: "Mon–Thu", hours: "12 pm – 12 am" },
      { days: "Fri–Sun", hours: "12 pm – 1 am" },
    ]);
    expect(weekHours(builtInSchedule, "ar", ar.locations)).toEqual([
      { days: "الاثنين–الخميس", hours: "12 ظهراً – 12 ليلاً" },
      { days: "الجمعة–الأحد", hours: "12 ظهراً – 1 فجراً" },
    ]);
  });

  it("says every day, and marks closed days", () => {
    const daily: Schedule = { ...shop, hours: Array(7).fill([780, 1440]) };
    expect(weekHours(daily, "ar", ar.locations)).toEqual([
      { days: "كل يوم", hours: "1 ظهراً – 12 ليلاً" },
    ]);
    const mondays: Schedule = {
      ...daily,
      hours: daily.hours.map((h, day) => (day === 1 ? null : h)),
    };
    expect(weekHours(mondays, "en", en.locations)).toEqual([
      { days: "Mon", hours: "Closed" },
      { days: "Tue–Sun", hours: "1 pm – 12 am" },
    ]);
  });
});

describe("formatClock", () => {
  it("writes short clock times", () => {
    expect(formatClock(720, "en")).toBe("12 pm");
    expect(formatClock(1435, "en")).toBe("11:55 pm");
    expect(formatClock(1500, "en")).toBe("1 am");
    expect(formatClock(1155, "ar")).toBe("7:15 م");
  });
});
