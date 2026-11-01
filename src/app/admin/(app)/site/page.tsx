import type { Metadata } from "next";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { PageTabs } from "@/components/admin/page-tabs";
import { site } from "@/data/site";
import { parseSiteSettings } from "@/lib/site-settings";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { PopupForm, TickerForm } from "./site-forms";

export const metadata: Metadata = { title: "Website" };

/** The public site: the same host in development, the live domain otherwise. */
const publicBase = process.env.NODE_ENV === "production" ? site.url : "";

const tabs = [
  { href: "/admin/site", label: "Home ticker" },
  { href: "/admin/site?tab=popup", label: "Welcome popup" },
];

export default async function WebsitePage({ searchParams }: PageProps<"/admin/site">) {
  await requireStaff("manager");
  const { tab } = await searchParams;
  const popup = tab === "popup";
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
        title="Website"
        actions={
          popup && (
            <a
              href={`${publicBase}/en?popup=1`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              <Icon name="external" className="size-4" />
              Preview the saved popup
            </a>
          )
        }
      />
      <PageTabs label="Website" tabs={tabs} current={popup ? tabs[1].href : tabs[0].href} />
      {popup ? (
        <PopupForm
          initial={welcomePopup}
          items={(items.data ?? []).map((i) => ({ slug: i.slug, name: i.name_en }))}
          categories={(categories.data ?? []).map((c) => ({ slug: c.slug, name: c.name_en }))}
          codes={(codes.data ?? []).map((c) => c.code)}
        />
      ) : (
        <TickerForm initial={homeTicker} />
      )}
    </>
  );
}
