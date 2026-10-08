import type { Metadata } from "next";
import { money, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { categoryLabel, loadCategories } from "../menu/data";
import { PriceGrid, type PriceSection } from "./price-grid";

export const metadata: Metadata = { title: "Prices" };

export default async function PricesPage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [categories, products, groups, log] = await Promise.all([
    loadCategories(db),
    db
      .from("products")
      .select("id, name_en, kind, category_id, price_cents")
      .order("sort_order")
      .order("name_en"),
    db
      .from("option_groups")
      .select("id, name_en, kind, options(id, name_en, price_cents, sort_order)")
      .eq("kind", "options")
      .order("name_en"),
    db.rpc("audit_trail", { p_column: "price_cents", p_limit: 60 }),
  ]);
  if (products.error || groups.error) throw new Error("Loading the prices failed.");

  const ordered = categories
    .filter((c) => !c.parentId)
    .flatMap((top) => [top, ...categories.filter((c) => c.parentId === top.id)]);
  const sections: PriceSection[] = [
    ...ordered.map((c) => ({
      title: categoryLabel(categories, c.id),
      rows: products.data
        .filter((p) => p.category_id === c.id)
        .map((p) => ({
          kind: "product" as const,
          id: p.id,
          name: p.kind === "bundle" ? `${p.name_en} (bundle)` : p.name_en,
          cents: p.price_cents,
        })),
    })),
    ...groups.data.map((g) => ({
      title: g.name_en,
      note: "add-on prices",
      rows: [...g.options]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ kind: "option" as const, id: o.id, name: o.name_en, cents: o.price_cents })),
    })),
  ].filter((s) => s.rows.length > 0);

  // The price log, with names from the current menu.
  const names = new Map<string, string>([
    ...products.data.map((p) => [p.id, p.name_en] as const),
    ...groups.data.flatMap((g) =>
      g.options.map((o) => [o.id, `${o.name_en} (${g.name_en})`] as const),
    ),
  ]);
  const entries = (log.data ?? []).filter(
    (e) => e.action === "update" && (e.table_name === "products" || e.table_name === "options"),
  );

  return (
    <>
      <PageHeader
        title="Prices"
        description="Every price on the menu. Change any, or tick several and change them by % or $; nothing saves until you press Save."
      />
      <PriceGrid sections={sections} />
      <section className="card p-5">
        <h2 className="mb-2 text-base font-bold">Price changes</h2>
        {entries.length === 0 ? (
          <p className="text-muted">No price changes yet.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-line">
            {entries.map((e, i) => {
              const [from, to] = (e.changes as { price_cents: [number, number] }).price_cents;
              return (
                <li
                  key={`${e.at}-${i}`}
                  className="flex flex-wrap justify-between gap-x-4 py-2 text-[13px]"
                >
                  <span>
                    <span className="font-semibold">{names.get(e.row_id) ?? "A deleted item"}</span>{" "}
                    {money(from)} → {money(to)}
                  </span>
                  <span className="text-muted">
                    {e.actor_name} · {when(e.at)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
