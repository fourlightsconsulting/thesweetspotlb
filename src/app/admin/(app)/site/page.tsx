import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { site } from "@/data/site";
import { parseSiteSettings } from "@/lib/site-settings";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { metaCapiConfigured } from "@/server/meta-capi";
import { PopupForm, TickerForm } from "./site-forms";
import { type Connection, TrackingCard } from "./tracking-card";

export const metadata: Metadata = { title: "Site" };

/** The public site: the same host in development, the live domain otherwise. */
const publicBase = process.env.NODE_ENV === "production" ? site.url : "";

export default async function SitePage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [settings, items, categories, codes, usage] = await Promise.all([
    db
      .from("site_settings")
      .select("key, value")
      .in("key", ["home_ticker", "welcome_popup", "tracking"]),
    db
      .from("products")
      .select("slug, name_en")
      .eq("is_active", true)
      .eq("orderable_online", true)
      .order("name_en"),
    db
      .from("categories")
      .select("slug, name_en")
      .is("parent_id", null)
      .eq("is_active", true)
      .order("sort_order"),
    db.from("discount_codes").select("code").eq("is_active", true).order("code"),
    db.rpc("database_usage").maybeSingle(),
  ]);
  const { homeTicker, welcomePopup, tracking } = parseSiteSettings(settings.data ?? []);
  const set = (value: string | undefined) => Boolean(value?.trim());
  const connections: Connection[] = [
    {
      name: "Meta pixel",
      on: set(process.env.NEXT_PUBLIC_META_PIXEL_ID),
      detail: set(process.env.NEXT_PUBLIC_META_PIXEL_ID) ? "on the website" : "not set up yet",
    },
    {
      name: "Meta Conversions API",
      on: metaCapiConfigured(),
      detail: metaCapiConfigured() ? "sending from the server" : "needs a token",
    },
    {
      name: "Google Analytics 4",
      on: set(process.env.NEXT_PUBLIC_GA4_ID),
      detail: set(process.env.NEXT_PUBLIC_GA4_ID) ? "on the website" : "not set up yet",
    },
    {
      name: "Google Ads",
      on: set(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID),
      detail: !set(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID)
        ? "not set up yet"
        : set(process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL)
          ? "tag and purchase conversion"
          : "tag only: add the purchase label",
    },
  ];

  return (
    <>
      <PageHeader title="Site" />
      <div className="flex flex-col gap-6">
        <TickerForm initial={homeTicker} />
        <PopupForm
          initial={welcomePopup}
          items={(items.data ?? []).map((i) => ({ slug: i.slug, name: i.name_en }))}
          categories={(categories.data ?? []).map((c) => ({ slug: c.slug, name: c.name_en }))}
          codes={(codes.data ?? []).map((c) => c.code)}
          previewUrl={`${publicBase}/en?popup=1`}
        />
        <TrackingCard
          firstParty={tracking.first_party}
          usage={
            usage.data
              ? {
                  databaseBytes: Number(usage.data.database_bytes),
                  eventsBytes: Number(usage.data.events_bytes),
                  events: usage.data.events,
                }
              : null
          }
          connections={connections}
        />
      </div>
    </>
  );
}
