import { describe, expect, it } from "vitest";
import { adsCostRequest, ga4Window, parseAdsCost, parseGa4, parseGsc } from "./google";
import { insightsUrl, parseAdRow, pickAction } from "./meta-ads";
import { facebookRow, instagramRow, readSeries, readTotals } from "./social";

describe("Meta ads", () => {
  it("takes the first matching action and never adds them up", () => {
    const actions = [
      { action_type: "omni_purchase", value: "3" },
      { action_type: "offsite_conversion.fb_pixel_purchase", value: "2" },
      { action_type: "purchase", value: "3" },
    ];
    expect(pickAction(actions, ["offsite_conversion.fb_pixel_purchase", "omni_purchase"])).toBe(2);
  });

  it("parses a row per ad, day and placement, in cents", () => {
    const row = parseAdRow({
      ad_id: "9",
      ad_name: "Crepe reel",
      adset_id: "8",
      campaign_id: "7",
      campaign_name: "Launch",
      date_start: "2026-10-08",
      publisher_platform: "instagram",
      platform_position: "reels",
      spend: "12.345",
      impressions: "1500",
      inline_link_clicks: "40",
      actions: [
        { action_type: "landing_page_view", value: "31" },
        { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "4" },
        { action_type: "omni_purchase", value: "2" },
      ],
      action_values: [{ action_type: "omni_purchase", value: "24.5" }],
    });
    expect(row).toMatchObject({
      day: "2026-10-08",
      ad_id: "9",
      publisher: "instagram",
      placement: "reels",
      spend_cents: 1235,
      impressions: 1500,
      link_clicks: 40,
      landing_page_views: 31,
      messaging_started: 4,
      purchases: 2,
      purchase_value_cents: 2450,
      add_to_cart: null,
    });
    expect(parseAdRow({ date_start: "2026-10-08" })).toBeNull();
  });

  it("asks for ads by day and placement", () => {
    const url = new URL(
      insightsUrl({ accountId: "123", since: "2026-10-01", until: "2026-10-07" }),
    );
    expect(url.pathname).toBe("/v21.0/act_123/insights");
    expect(url.searchParams.get("breakdowns")).toBe("publisher_platform,platform_position");
    expect(url.searchParams.get("time_increment")).toBe("1");
  });
});

describe("Instagram and Facebook", () => {
  it("files a day's series and totals under that day, followers only today", () => {
    const series = readSeries({
      data: [
        { name: "reach", values: [{ value: 420 }] },
        { name: "follower_count", values: [{ value: 6 }] },
      ],
    });
    const totals = readTotals({
      data: [
        { name: "profile_views", total_value: { value: 31 } },
        { name: "likes", total_value: null },
      ],
    });
    expect(
      instagramRow({ accountId: "ig", day: "2026-10-08", series, totals, followersToday: 1200 }),
    ).toMatchObject({
      report: "account",
      day: "2026-10-08",
      dim1: "ig",
      metrics: { followers: 1200, new_followers: 6, reach: 420, profile_views: 31, likes: null },
    });
    expect(
      facebookRow({ pageId: "fb", day: "2026-10-08", series: { page_follows: 900 } }).metrics
        .followers,
    ).toBe(900);
  });
});

describe("Google", () => {
  it("reads GA4 rows by day, and snapshots under their last day", () => {
    const rows = parseGa4(
      {
        dimensionHeaders: [{ name: "date" }, { name: "country" }, { name: "city" }],
        metricHeaders: [{ name: "sessions" }, { name: "totalUsers" }],
        rows: [
          {
            dimensionValues: [{ value: "20261008" }, { value: "Lebanon" }, { value: "Tripoli" }],
            metricValues: [{ value: "12" }, { value: "10" }],
          },
        ],
      },
      "2026-10-08",
    );
    expect(rows).toEqual([
      {
        day: "2026-10-08",
        dim1: "Lebanon",
        dim2: "Tripoli",
        dim3: "",
        metrics: { sessions: 12, users: 10 },
      },
    ]);
    expect(ga4Window("audience", "2026-10-02", "2026-10-08")).toEqual({
      since: "2026-07-11",
      until: "2026-10-08",
    });
  });

  it("turns Google Ads cost into campaign rows, skipping non-ad traffic", () => {
    expect(adsCostRequest("2026-10-01", "2026-10-07").metrics[0].name).toBe("advertiserAdCost");
    expect(
      parseAdsCost({
        rows: [
          {
            dimensionValues: [{ value: "20261008" }, { value: "55" }, { value: "Search" }],
            metricValues: [{ value: "3.456" }, { value: "12" }, { value: "300" }],
          },
          {
            dimensionValues: [
              { value: "20261008" },
              { value: "(not set)" },
              { value: "(not set)" },
            ],
            metricValues: [{ value: "0" }, { value: "0" }, { value: "0" }],
          },
        ],
      }),
    ).toEqual([
      {
        day: "2026-10-08",
        campaign_id: "55",
        campaign_name: "Search",
        spend_cents: 346,
        clicks: 12,
        impressions: 300,
      },
    ]);
  });

  it("weights search position by impressions", () => {
    expect(
      parseGsc({
        rows: [
          { keys: ["2026-10-08", "crepes tripoli"], clicks: 3, impressions: 40, position: 2.5 },
        ],
      })[0],
    ).toEqual({
      day: "2026-10-08",
      dim1: "crepes tripoli",
      dim2: "",
      dim3: "",
      metrics: { clicks: 3, impressions: 40, position_sum: 100 },
    });
  });
});
