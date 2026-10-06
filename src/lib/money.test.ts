import { describe, expect, it } from "vitest";
import { formatAddOn, formatPrice, formatPriceShort } from "./money";

const isolated = (s: string) => `⁦${s}⁩`;

describe("money", () => {
  it("formats cents as dollars", () => {
    expect(formatPrice(650)).toBe("$6.50");
    expect(formatPrice(-750)).toBe("−$7.50");
    expect(formatPriceShort(1800)).toBe("$18");
    expect(formatPriceShort(1222)).toBe("$12.22");
    expect(formatAddOn(50)).toBe("+$0.50");
    expect(formatAddOn(0)).toBe("");
  });

  it("puts the sign after the amount on Arabic pages, in one isolated piece", () => {
    expect(formatPrice(650, "ar")).toBe(isolated("6.50$"));
    expect(formatPrice(-750, "ar")).toBe(isolated("−7.50$"));
    expect(formatAddOn(300, "ar")).toBe(isolated("+3.00$"));
  });
});
