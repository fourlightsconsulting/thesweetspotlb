import { describe, expect, it } from "vitest";
import { browserName, crawlerReason, deviceType, osName } from "./classify";
import { isBrowserEvent, metaName, purchaseEventId } from "./events";
import { cleanParams, cleanUrl } from "./sanitize";

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const instagramAndroid =
  "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0";
const cubot =
  "Mozilla/5.0 (Linux; Android 12; CUBOT KINGKONG 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const linuxDesktop =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

describe("visitors", () => {
  it("names robots, but not the CUBOT phone", () => {
    expect(crawlerReason("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("user_agent");
    expect(crawlerReason("Google-AdWords-Express")).toBe("user_agent");
    expect(crawlerReason("facebookexternalhit/1.1")).toBe("user_agent");
    expect(crawlerReason(cubot, "Asia/Beirut")).toBeNull();
    expect(crawlerReason(iphone, "Asia/Beirut")).toBeNull();
  });

  it("treats a Linux computer on a foreign clock as hosted automation", () => {
    expect(crawlerReason(linuxDesktop, "America/Los_Angeles")).toBe("foreign_linux_desktop");
    expect(crawlerReason(linuxDesktop, "Asia/Beirut")).toBeNull();
  });

  it("reads device, browser and system", () => {
    expect([deviceType(iphone), browserName(iphone), osName(iphone)]).toEqual([
      "mobile",
      "Safari",
      "iOS",
    ]);
    expect(browserName(instagramAndroid)).toBe("Instagram");
    expect(osName(instagramAndroid)).toBe("Android");
  });
});

describe("events", () => {
  it("accepts browser events and refuses server-only or unknown ones", () => {
    expect(isBrowserEvent("add_to_cart")).toBe(true);
    expect(isBrowserEvent("order_placed")).toBe(false);
    expect(isBrowserEvent("toString")).toBe(false);
    expect(metaName("begin_checkout")).toBe("InitiateCheckout");
    expect(purchaseEventId("abc")).toBe("purchase:abc");
  });
});

describe("sanitising", () => {
  it("drops secrets, personal data and tracking tags from URLs", () => {
    expect(cleanUrl("/en/order?item=lotus-crepe&utm_source=ig&fbclid=x#top")).toBe(
      "/en/order?item=lotus-crepe",
    );
    expect(cleanUrl("/en/checkout?token=abc&phone=71")).toBe("/en/checkout");
    expect(cleanUrl("https://www.instagram.com/p/1?utm_medium=x", { stripTracking: false })).toBe(
      "https://www.instagram.com/p/1?utm_medium=x",
    );
  });

  it("keeps short primitive params only", () => {
    expect(
      cleanParams({ code: "SWEET20", phone: "71", nested: { a: 1 }, ok: true, n: 3, bad: NaN }),
    ).toEqual({ code: "SWEET20", ok: true, n: 3 });
  });
});
