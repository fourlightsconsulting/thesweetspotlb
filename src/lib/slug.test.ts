import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("makes URL ids from English names", () => {
    expect(slugify("Nutella Crêpe")).toBe("nutella-crepe");
    expect(slugify("  Mango & Passion — Mojito! ")).toBe("mango-passion-mojito");
  });

  it("falls back for names without Latin letters", () => {
    expect(slugify("كريب", "area")).toMatch(/^area-[a-z0-9]{1,5}$/);
  });
});
