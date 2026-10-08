import { describe, expect, it } from "vitest";
import { ago, beirutLocalToIso, isoToBeirutLocal, orderLabel, startOfBeirutDay } from "./format";

describe("admin formatting", () => {
  it("finds midnight in Beirut, summer and winter", () => {
    expect(startOfBeirutDay("2026-10-09")).toBe("2026-10-08T21:00:00.000Z");
    expect(startOfBeirutDay("2026-12-01")).toBe("2026-11-30T22:00:00.000Z");
  });

  it("round-trips datetime-local values in Beirut time", () => {
    expect(beirutLocalToIso("2026-10-10T18:00")).toBe("2026-10-10T15:00:00.000Z");
    expect(isoToBeirutLocal("2026-10-10T15:00:00.000Z")).toBe("2026-10-10T18:00");
  });

  it("labels orders and waits", () => {
    expect(orderLabel(1001)).toBe("TSS-1001");
    const now = new Date("2026-10-09T12:00:00Z");
    expect(ago("2026-10-09T11:59:40Z", now)).toBe("just now");
    expect(ago("2026-10-09T11:56:00Z", now)).toBe("4 min");
    expect(ago("2026-10-09T10:55:00Z", now)).toBe("1 h 5 min");
  });
});
