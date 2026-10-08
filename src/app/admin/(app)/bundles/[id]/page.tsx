import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, type HistoryEntry } from "@/components/admin/history";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { site } from "@/data/site";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { categoryLabel, loadCategories, photoSrc } from "../../menu/data";
import type { ItemValues } from "../../menu/items/[id]/item-form";
import { BundleForm, type Slot } from "./bundle-form";

export const metadata: Metadata = { title: "Bundle" };

/** The public site: the same host in development, the live domain otherwise. */
const publicBase = process.env.NODE_ENV === "production" ? site.url : "";

export default async function BundlePage({
  params,
  searchParams,
}: PageProps<"/admin/bundles/[id]">) {
  await requireStaff("manager");
  const { id } = await params;
  const { created } = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const db = await adminClient();
  const [categories, items, bundle, links, history] = await Promise.all([
    loadCategories(db),
    db
      .from("products")
      .select("id, name_en, price_cents, category_id")
      .eq("kind", "item")
      .order("sort_order")
      .order("name_en"),
    isNew ? null : db.from("products").select("*").eq("id", id).eq("kind", "bundle").maybeSingle(),
    isNew
      ? null
      : db
          .from("product_option_groups")
          .select(
            "sort_order, option_groups!inner(id, kind, name_en, name_ar, source_category_id, options(product_id, price_cents, sort_order))",
          )
          .eq("product_id", id)
          .eq("option_groups.kind", "items")
          .order("sort_order"),
    isNew ? null : db.rpc("audit_trail", { p_table: "products", p_row_id: id, p_limit: 30 }),
  ]);
  if (!isNew && !bundle?.data) notFound();
  const b = bundle?.data;

  const ordered = categories
    .filter((c) => !c.parentId)
    .flatMap((top) => [top, ...categories.filter((c) => c.parentId === top.id)]);
  const categoryChoices = ordered.map((c) => ({
    id: c.id,
    label: categoryLabel(categories, c.id),
  }));
  const boxes = categories.find((c) => c.slug === "boxes");

  const values: ItemValues = b
    ? {
        id: b.id,
        nameEn: b.name_en,
        nameAr: b.name_ar,
        descriptionEn: b.description_en,
        descriptionAr: b.description_ar,
        categoryId: b.category_id,
        price: b.price_cents,
        tag: b.tag ?? "",
        imagePath: b.image_path,
        imageSrc: photoSrc(b.image_path),
        active: b.is_active,
        online: b.orderable_online,
        available: b.is_available,
        groups: [],
      }
    : {
        id: null,
        nameEn: "",
        nameAr: "",
        descriptionEn: "",
        descriptionAr: "",
        categoryId: boxes?.id ?? categoryChoices[0]?.id ?? "",
        price: 0,
        tag: "",
        imagePath: null,
        imageSrc: null,
        active: true,
        online: true,
        available: true,
        groups: [],
      };

  const slots: Slot[] = (links?.data ?? []).map((link) => {
    const g = link.option_groups;
    const choices = [...g.options]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((o) =>
        o.product_id ? [{ productId: o.product_id, surcharge: o.price_cents }] : [],
      );
    return {
      key: g.id,
      groupId: g.id,
      nameEn: g.name_en,
      nameAr: g.name_ar,
      mode: choices.length === 1 && !g.source_category_id ? "fixed" : "pick",
      choices,
      sourceCategoryId: g.source_category_id,
    };
  });

  return (
    <>
      <PageHeader
        title={b ? b.name_en : "New bundle"}
        description={
          created
            ? "Added to the menu."
            : "A box or combo: a price, and parts that are set or picked by the customer."
        }
        actions={
          <>
            {b && (
              <a
                href={`${publicBase}/en/order?item=${b.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <Icon name="external" className="size-4" />
                See it on the site
              </a>
            )}
            <Link href="/admin/bundles" className="btn btn-ghost">
              All bundles
            </Link>
          </>
        }
      />
      <BundleForm
        bundle={values}
        slots={slots}
        categories={categoryChoices}
        items={(items.data ?? []).map((i) => ({
          id: i.id,
          name: i.name_en,
          price: i.price_cents,
          categoryLabel: categoryLabel(categories, i.category_id),
        }))}
      />
      {b && (
        <section className="card mt-6 p-5">
          <h2 className="mb-2 text-base font-bold">History</h2>
          <History entries={(history?.data ?? []) as HistoryEntry[]} />
        </section>
      )}
    </>
  );
}
