import { describe, expect, it } from "vitest";
import { eachDay, readPeriod } from "./period";

const today = "2026-10-09";

describe("dashboard periods", () => {
  it("defaults to the last 30 days, compared with the 30 before", () => {
    expect(readPeriod({}, today)).toMatchObject({
      from: "2026-09-10",
      to: "2026-10-09",
      preset: "30d",
      days: 30,
      previous: { from: "2026-08-11", to: "2026-09-09" },
    });
    expect(readPeriod({ period: "7d" }, today)).toMatchObject({ from: "2026-10-03", days: 7 });
  });

  it("knows the year so far", () => {
    expect(readPeriod({ period: "ytd" }, today)).toMatchObject({ from: "2026-01-01", to: today });
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
    ).toBe("30d");
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
