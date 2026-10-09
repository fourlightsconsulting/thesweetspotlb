import { describe, expect, it } from "vitest";
import { eachDay, readPeriod } from "./period";

const today = "2026-10-09";

describe("dashboard periods", () => {
  it("defaults to the last 7 days, compared with the 7 before", () => {
    expect(readPeriod({}, today)).toMatchObject({
      from: "2026-10-03",
      to: "2026-10-09",
      preset: "7d",
      days: 7,
      previous: { from: "2026-09-26", to: "2026-10-02" },
    });
  });

  it("knows months, including last month", () => {
    expect(readPeriod({ period: "month" }, today)).toMatchObject({ from: "2026-10-01", to: today });
    expect(readPeriod({ period: "last-month" }, today)).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
      previous: { from: "2026-08-02", to: "2026-08-31" },
    });
  });

  it("takes custom dates, never past today, and falls back when they're wrong", () => {
    expect(
      readPeriod({ period: "custom", from: "2026-10-01", to: "2026-12-01" }, today),
    ).toMatchObject({ from: "2026-10-01", to: today, preset: "custom", label: "1 Oct – 9 Oct" });
    expect(
      readPeriod({ period: "custom", from: "2026-10-05", to: "2026-10-01" }, today).preset,
    ).toBe("7d");
  });

  it("lists every day", () => {
    expect(eachDay("2026-09-29", "2026-10-02")).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });
});
