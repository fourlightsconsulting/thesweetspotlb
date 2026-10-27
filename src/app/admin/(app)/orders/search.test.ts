import { describe, expect, it } from "vitest";
import { orderSearch } from "./search";

describe("order search", () => {
  it.each([
    "71234567",
    "96171234567",
    "+96171234567",
    "0096171234567",
    "71 234 567",
    "+961 (71) 234-567",
  ])("recognizes the phone %s regardless of formatting", (q) =>
    expect(orderSearch(q)).toEqual({ kind: "phone", value: "+96171234567" }),
  );

  it.each(["03123456", "3123456", "+9613123456"])("recognizes older mobiles: %s", (q) => {
    expect(orderSearch(q)).toEqual({ kind: "phone", value: "+9613123456" });
  });

  it("keeps explicit and short order-number searches working", () => {
    expect(orderSearch("1001")).toEqual({ kind: "number", value: 1001 });
    expect(orderSearch("tss1001")).toEqual({ kind: "number", value: 1001 });
    expect(orderSearch("TSS-71234567")).toEqual({ kind: "number", value: 71234567 });
  });

  it("keeps partial phones and names searchable", () => {
    expect(orderSearch("71 234")).toEqual({ kind: "partialPhone", value: "71234" });
    expect(orderSearch("Maya Haddad")).toEqual({ kind: "name", value: "Maya Haddad" });
  });
});
