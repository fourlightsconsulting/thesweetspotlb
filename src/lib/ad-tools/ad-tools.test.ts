import { describe, expect, it } from "vitest";
import {
  bumpVersion,
  destinationUrl,
  mediumFor,
  shortLink,
  slug,
  suggestLinkId,
  tagValue,
  taggedUrl,
} from "./links";
import {
  adName,
  adSetName,
  assetFileName,
  audienceId,
  audienceName,
  campaignName,
  creativeId,
  linkTemplates,
  nextAudienceNumber,
  nextCreativeNumber,
  nextCreativeVersion,
  yymm,
} from "./naming";

const site = "https://thesweetspotlb.com";

describe("tracking links", () => {
  it("spells tags one way", () => {
    expect(slug("  Table Tent (A5)! ")).toBe("table-tent-a5");
    expect(slug("Crêpe Day")).toBe("crepe-day");
    expect(tagValue("FB_Sales_Launch 2_2610")).toBe("fb_sales_launch-2_2610");
    expect(tagValue("__x__")).toBe("x");
  });

  it("tags a page, leaving empty tags out", () => {
    const url = taggedUrl(`${site}/en/order?item=lotus-crepe`, {
      source: "flyer",
      medium: "qr",
      campaign: "launch",
      content: "",
      id: "launch-flyer-01",
    });
    expect(url).toBe(
      `${site}/en/order?item=lotus-crepe&utm_source=flyer&utm_medium=qr&utm_campaign=launch&utm_id=launch-flyer-01`,
    );
    expect(taggedUrl("not a url", { source: "a", medium: "b", campaign: "c", id: "d" })).toBe("");
    expect(
      taggedUrl("javascript:alert(1)", { source: "a", medium: "b", campaign: "c", id: "d" }),
    ).toBe("");
  });

  it("picks the usual medium for a source", () => {
    expect(mediumFor("Flyer")).toBe("qr");
    expect(mediumFor("table tent")).toBe("qr");
    expect(mediumFor("whatsapp")).toBe("whatsapp");
    expect(mediumFor("instagram")).toBe("social");
  });

  it("suggests the next free id", () => {
    expect(suggestLinkId("Launch", "Flyer", [])).toBe("launch-flyer-01");
    expect(suggestLinkId("launch", "flyer", ["launch-flyer-01", "launch-flyer-02"])).toBe(
      "launch-flyer-03",
    );
    expect(suggestLinkId("", "", [])).toBe("link-01");
  });

  it("bumps versions and builds pages", () => {
    expect(bumpVersion("story")).toBe("story-v2");
    expect(bumpVersion("story-v2")).toBe("story-v3");
    expect(bumpVersion("")).toBe("");
    expect(shortLink(site, "launch-flyer-01")).toBe(`${site}/l/launch-flyer-01`);
    expect(destinationUrl(site, "item", "ar", { item: "lotus-crepe" })).toBe(
      `${site}/ar/order?item=lotus-crepe`,
    );
    expect(destinationUrl(site, "item", "en")).toBe("");
    expect(destinationUrl(site, "home", "en")).toBe(`${site}/en`);
  });
});

describe("ad names", () => {
  it("builds names with fixed positions", () => {
    expect(
      campaignName({
        platform: "fb",
        objective: "sales",
        initiative: "Ramadan Nights",
        month: "2610",
      }),
    ).toBe("fb_sales_ramadan-nights_2610");
    // An empty field keeps its place.
    expect(campaignName({ platform: "fb", objective: "", initiative: "x", month: "2610" })).toBe(
      "fb_none_x_2610",
    );
    expect(
      adSetName({
        stage: "prospect",
        location: "website",
        goal: "purchase",
        audience: "geo001",
        version: "2",
      }),
    ).toBe("prospect_website_purchase_geo001_v2");
    expect(
      adName({ creative: "261001-01-product-lotus-crepe", format: "reel", cta: "ordernow" }),
    ).toBe("261001-01-product-lotus-crepe_reel_ordernow");
    expect(yymm("2026-10")).toBe("2610");
    expect(yymm("oops")).toBe("");
  });

  it("numbers creatives by month, idea and version", () => {
    const id = creativeId({
      month: "2610",
      number: 1,
      version: "1",
      pillar: "product",
      subject: "Lotus Crêpe",
    });
    expect(id).toBe("261001-01-product-lotus-crepe");
    expect(assetFileName({ creative: id, ratio: "9x16", ext: "mp4" })).toBe(
      "261001-01-product-lotus-crepe_9x16.mp4",
    );
    expect(assetFileName({ creative: id, ratio: "1x1", frame: "2", ext: "jpg" })).toBe(
      "261001-01-product-lotus-crepe_1x1-f2.jpg",
    );
    const taken = [id, "261002-01-offer-sweet10", "261002-02-offer-sweet10", "260901-01-new-x"];
    expect(nextCreativeNumber("2610", taken)).toBe(3);
    expect(nextCreativeNumber("2611", taken)).toBe(1);
    expect(nextCreativeVersion("2610", 2, taken)).toBe(3);
    expect(nextCreativeVersion("2610", 5, taken)).toBe(1);
  });

  it("names audiences", () => {
    expect(audienceId("geo", 1)).toBe("geo001");
    expect(nextAudienceNumber("geo", ["geo001", "geo007", "rt002"])).toBe(8);
    expect(nextAudienceNumber("rt", [])).toBe(1);
    expect(
      audienceName({ platform: "fb", id: "geo001", descriptor: "Tripoli Mina", scope: "5km" }),
    ).toBe("fb_geo001_tripoli-mina_5km");
  });

  it("tags ads with names the dashboards match", () => {
    expect(linkTemplates.meta).toContain("utm_campaign={{campaign.name}}");
    expect(linkTemplates.meta).toContain("utm_content={{ad.name}}");
    expect(linkTemplates.google("gg_sales_launch_2610")).toBe(
      "utm_source=google&utm_medium=cpc&utm_campaign=gg_sales_launch_2610",
    );
  });
});
