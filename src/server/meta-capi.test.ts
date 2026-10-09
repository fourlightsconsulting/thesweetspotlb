import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "@/lib/tracking/identity";
import { metaCapiConfigured, sendMetaEvents } from "./meta-capi";

describe("Meta Conversions API", () => {
  beforeEach(() => {
    vi.stubEnv("META_PIXEL_ID", "123");
    vi.stubEnv("META_CAPI_TOKEN", "token");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stays off without a token", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "");
    expect(metaCapiConfigured()).toBe(false);
    expect(await sendMetaEvents([])).toBe(false);
  });

  it("hashes the customer, keeps the browser ids raw and reuses the event id", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendMetaEvents([
      {
        eventName: "Purchase",
        eventId: "purchase:ref-1",
        eventTime: new Date("2026-10-09T12:00:00Z"),
        eventSourceUrl: "https://thesweetspotlb.com/en/checkout",
        customer: { phone: "71 234 567", name: "Maya Haddad", externalIds: ["v_1", null] },
        browser: { fbp: "fb.1.1.2", fbc: null, ip: "1.2.3.4", userAgent: "UA" },
        customData: { value: 12.5, currency: "USD" },
      },
    ]);

    expect(sent).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/123/events");
    const event = JSON.parse(String(init.body)).data[0];
    expect(event).toMatchObject({
      event_name: "Purchase",
      event_id: "purchase:ref-1",
      event_time: Date.parse("2026-10-09T12:00:00Z") / 1000,
      action_source: "website",
      custom_data: { value: 12.5, currency: "USD" },
    });
    expect(event.user_data).toEqual({
      ph: [await sha256("96171234567")],
      fn: [await sha256("maya")],
      ln: [await sha256("haddad")],
      country: [await sha256("lb")],
      external_id: [await sha256("v_1")],
      client_ip_address: "1.2.3.4",
      client_user_agent: "UA",
      fbp: "fb.1.1.2",
    });
  });

  it("reports a refusal as not sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 190 } }), { status: 400 })),
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(
      await sendMetaEvents([
        { eventName: "PageView", eventId: "x", eventSourceUrl: "https://a", browser: {} },
      ]),
    ).toBe(false);
  });
});
