import { describe, expect, it } from "vitest";
import { formatPhoneLocal, normalisePhone } from "./phone";

describe("normalisePhone", () => {
  it.each([
    ["71 234 567", "+96171234567"],
    ["071234567", "+96171234567"],
    ["+961 71 234 567", "+96171234567"],
    ["00961-71-234-567", "+96171234567"],
    ["81 123 456", "+96181123456"],
    ["03 123 456", "+9613123456"],
    ["3123456", "+9613123456"],
    ["06 123 456", "+9616123456"],
  ])("reads %s as %s", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it.each(["", "1234", "61234567", "0000000", "+44 7700 900123", "71 234 5678"])(
    "rejects %s",
    (input) => {
      expect(normalisePhone(input)).toBeNull();
    },
  );
});

describe("formatPhoneLocal", () => {
  it("groups mobiles and the older 7-digit numbers", () => {
    expect(formatPhoneLocal("+96171234567")).toBe("71 234 567");
    expect(formatPhoneLocal("+9613123456")).toBe("3 123 456");
  });
});
