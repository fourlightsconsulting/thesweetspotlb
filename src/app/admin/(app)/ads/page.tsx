import type { Metadata } from "next";
import Link from "next/link";
import { CopyField } from "@/components/admin/copy-button";
import { beirutDate, dateOf, money } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { site } from "@/data/site";
import { feedItems } from "@/lib/feeds/meta-catalog";
import { adminClient } from "@/lib/supabase/server";
import { getMenu } from "@/server/catalog";
import { requireStaff } from "@/server/admin/session";
import { type LinkRow, LinksTool } from "./links-tool";
import { AudiencesTool, CreativesTool, NamesTool, type RegistryRow } from "./naming-tools";

export const metadata: Metadata = { title: "Ad tools" };

const tabs = [
  { key: "links", label: "Links & QR codes" },
  { key: "names", label: "Ad names" },
  { key: "creatives", label: "Creatives" },
  { key: "audiences", label: "Audiences" },
  { key: "catalog", label: "Catalog" },
] as const;

type Tab = (typeof tabs)[number]["key"];
type Db = Awaited<ReturnType<typeof adminClient>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function registry(db: Db, kind: "creative" | "audience"): Promise<RegistryRow[]> {
  const { data } = await db
    .from("ad_registry")
    .select("id, code, name, note, archived, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    note: r.note,
    archived: r.archived,
    created: dateOf(r.created_at),
  }));
}

async function Links({ db, showArchived }: { db: Db; showArchived: boolean }) {
  const [links, results, menu] = await Promise.all([
    db
      .from("tracking_links")
      .select(
        "id, utm_id, label, url, destination, utm_source, utm_medium, utm_campaign, utm_content, utm_term, archived, created_at",
      )
      .order("created_at", { ascending: false }),
    db.rpc("tracking_link_results"),
    getMenu(),
  ]);
  const byId = new Map((results.data ?? []).map((r) => [r.utm_id, r]));
  const rows: LinkRow[] = (links.data ?? []).map((l) => {
    const r = byId.get(l.utm_id);
    return {
      id: l.id,
      utmId: l.utm_id,
      label: l.label,
      url: l.url,
      destination: l.destination,
      source: l.utm_source,
      medium: l.utm_medium,
      campaign: l.utm_campaign,
      content: l.utm_content,
      term: l.utm_term,
      archived: l.archived,
      created: dateOf(l.created_at),
      visits: r?.visits ?? 0,
      orders: r?.orders ?? 0,
      sales: money(r?.sales_cents ?? 0),
    };
  });
  return (
    <LinksTool
      links={rows}
      items={menu.items.map((i) => ({ id: i.id, name: i.name.en }))}
      siteUrl={site.url}
      showArchived={showArchived}
    />
  );
}

async function Catalog() {
  const menu = await getMenu();
  const inFeed = feedItems(menu);
  const noPhoto = menu.items.filter((i) => !i.image);
  const soldOut = inFeed.filter((i) => i.available === false);
  const feeds = [
    { label: "Menu feed (English)", url: `${site.url}/feeds/meta-catalog.csv` },
    { label: "Arabic language feed", url: `${site.url}/feeds/meta-catalog-ar.csv` },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-base font-bold">Meta catalog</h2>
        <p className="mt-1 text-muted">
          The menu as a catalog for Meta: catalog ads that show each person the items they looked
          at, and products to tag in Instagram posts. It updates itself from the menu: prices,
          photos and sold-out items.
        </p>
        <div className="mt-4 grid gap-4 wide:grid-cols-2">
          {feeds.map((f) => (
            <CopyField key={f.url} label={f.label} value={f.url} />
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
          <div>
            <dt className="text-muted">In the feed</dt>
            <dd className="text-lg font-bold tabular-nums">{inFeed.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Sold out now</dt>
            <dd className="text-lg font-bold tabular-nums">{soldOut.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Left out (no photo)</dt>
            <dd className="text-lg font-bold tabular-nums">{noPhoto.length}</dd>
          </div>
        </dl>
        {noPhoto.length > 0 && (
          <p className="mt-2 text-[13px] text-muted">
            Meta needs a photo for every product. Add one in{" "}
            <Link href="/admin/menu" className="font-semibold text-accent">
              Menu
            </Link>{" "}
            to include: {noPhoto.map((i) => i.name.en).join(", ")}.
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-base font-bold">Setting it up (once)</h2>
        <ol className="mt-2 flex list-decimal flex-col gap-2 ps-5">
          <li>
            In Meta Commerce Manager, create a catalog (type: E-commerce) owned by the shop’s
            business account.
          </li>
          <li>
            Catalog → Data sources → Data feed → Scheduled feed: paste the menu feed’s address and
            choose daily updates, currency USD.
          </li>
          <li>
            Open that data source → Settings → Add language feed: paste the Arabic feed’s address
            (scheduled daily).
          </li>
          <li>
            Catalog → Events: connect the shop’s pixel. Our item ids match the pixel’s, so Meta can
            tell which items each person viewed and ordered.
          </li>
        </ol>
        <p className="mt-3 text-[13px] text-muted">
          The feed works once the website is live at {new URL(site.url).hostname}.
        </p>
      </section>
    </div>
  );
}

export default async function AdToolsPage({ searchParams }: PageProps<"/admin/ads">) {
  await requireStaff("manager");
  const params = await searchParams;
  const tab: Tab = tabs.find((t) => t.key === one(params.tab))?.key ?? "links";
  const db = await adminClient();
  const month = beirutDate().slice(0, 7);

  let body: React.ReactNode;
  switch (tab) {
    case "names": {
      const [creatives, audiences] = await Promise.all([
        registry(db, "creative"),
        registry(db, "audience"),
      ]);
      body = (
        <NamesTool
          month={month}
          creatives={creatives.filter((c) => !c.archived)}
          audiences={audiences.filter((a) => !a.archived)}
        />
      );
      break;
    }
    case "creatives":
      body = <CreativesTool month={month} creatives={await registry(db, "creative")} />;
      break;
    case "audiences":
      body = <AudiencesTool audiences={await registry(db, "audience")} />;
      break;
    case "catalog":
      body = <Catalog />;
      break;
    default:
      body = <Links db={db} showArchived={one(params.archived) === "1"} />;
  }

  return (
    <>
      <PageHeader
        title="Ad tools"
        description="Tagged links and QR codes, names for ads, creatives and audiences, and the menu catalog for Meta."
      />
      <nav aria-label="Ad tools" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "links" ? "/admin/ads" : `/admin/ads?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className="-mb-px border-b-2 border-transparent px-3 py-2 font-semibold whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
