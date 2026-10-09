import { site } from "@/data/site";
import { metaCatalogCsv, metaLanguageFeedCsv } from "@/lib/feeds/meta-catalog";
import { loadMenuOrBuiltIn } from "@/server/menu";

// The menu for Meta's catalog: /feeds/meta-catalog.csv (English) and
// /feeds/meta-catalog-ar.csv (its Arabic language feed). Commerce Manager
// fetches them on a schedule; set up under Ad tools → Catalog. The menu is
// read uncached (Meta fetches daily), which keeps this route small.

const feeds: Record<string, typeof metaCatalogCsv> = {
  "meta-catalog.csv": metaCatalogCsv,
  "meta-catalog-ar.csv": metaLanguageFeedCsv,
};

export async function GET(_request: Request, { params }: RouteContext<"/feeds/[file]">) {
  const { file } = await params;
  const build = feeds[file];
  if (!build) return new Response("Not found", { status: 404 });
  const body = build(await loadMenuOrBuiltIn(), { siteUrl: site.url, brand: "The Sweet Spot" });
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
