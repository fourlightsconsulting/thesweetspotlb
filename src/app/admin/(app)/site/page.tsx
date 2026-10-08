import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { site } from "@/data/site";
import { parseSiteSettings } from "@/lib/site-settings";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { PopupForm, TickerForm } from "./site-forms";

export const metadata: Metadata = { title: "Site" };

/** The public site: the same host in development, the live domain otherwise. */
const publicBase = process.env.NODE_ENV === "production" ? site.url : "";

export default async function SitePage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [settings, items, categories, codes] = await Promise.all([
    db.from("site_settings").select("key, value").in("key", ["home_ticker", "welcome_popup"]),
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
  ]);
  const { homeTicker, welcomePopup } = parseSiteSettings(settings.data ?? []);

  return (
    <>
      <PageHeader
        title="Site"
        description="Words on the website that change often. The design itself stays as it is."
      />
      <div className="flex flex-col gap-6">
        <TickerForm initial={homeTicker} />
        <PopupForm
          initial={welcomePopup}
          items={(items.data ?? []).map((i) => ({ slug: i.slug, name: i.name_en }))}
          categories={(categories.data ?? []).map((c) => ({ slug: c.slug, name: c.name_en }))}
          codes={(codes.data ?? []).map((c) => c.code)}
          previewUrl={`${publicBase}/en?popup=1`}
        />
      </div>
    </>
  );
}
