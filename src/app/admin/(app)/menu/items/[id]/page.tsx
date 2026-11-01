import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, type HistoryEntry } from "@/components/admin/history";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { site } from "@/data/site";
import { groupDraft } from "@/lib/item-groups";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { categoryLabel, loadCategories, loadTemplates, photoSrc } from "../../data";
import { ItemForm, type ItemValues } from "./item-form";

export const metadata: Metadata = { title: "Menu item" };

/** The public site: the same host in development, the live domain otherwise. */
const publicBase = process.env.NODE_ENV === "production" ? site.url : "";

export default async function ItemPage({
  params,
  searchParams,
}: PageProps<"/admin/menu/items/[id]">) {
  await requireStaff("manager");
  const { id } = await params;
  const { created, category } = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const db = await adminClient();
  const [categories, templates, product, links, history] = await Promise.all([
    loadCategories(db),
    loadTemplates(db),
    isNew ? null : db.from("products").select("*").eq("id", id).eq("kind", "item").maybeSingle(),
    isNew
      ? null
      : db
          .from("product_option_groups")
          .select("*, product_options(*)")
          .eq("product_id", id)
          .order("sort_order"),
    isNew ? null : db.rpc("audit_trail", { p_table: "products", p_row_id: id, p_limit: 30 }),
  ]);
  if (!isNew && !product?.data) notFound();
  const p = product?.data;

  const groups = (links?.data ?? []).map((link) =>
    groupDraft(
      link,
      templates.find((t) => t.id === link.group_id),
      link.product_options,
    ),
  );
  const categoryChoices = categories
    .filter((c) => !c.parentId)
    .flatMap((top) => [top, ...categories.filter((c) => c.parentId === top.id)])
    .map((c) => ({ id: c.id, label: categoryLabel(categories, c.id) }));
  const startCategory =
    typeof category === "string" && categories.some((c) => c.id === category)
      ? category
      : (categoryChoices[0]?.id ?? "");

  const values: ItemValues = p
    ? {
        id: p.id,
        nameEn: p.name_en,
        nameAr: p.name_ar,
        descriptionEn: p.description_en,
        descriptionAr: p.description_ar,
        categoryId: p.category_id,
        price: p.price_cents,
        tag: p.tag ?? "",
        imagePath: p.image_path,
        imageSrc: photoSrc(p.image_path),
        active: p.is_active,
        online: p.orderable_online,
        available: p.is_available,
      }
    : {
        id: null,
        nameEn: "",
        nameAr: "",
        descriptionEn: "",
        descriptionAr: "",
        categoryId: startCategory,
        price: 0,
        tag: "",
        imagePath: null,
        imageSrc: null,
        active: true,
        online: true,
        available: true,
      };

  return (
    <>
      <PageHeader
        title={p ? p.name_en : "New item"}
        description={
          created ? "Added to the menu." : p ? categoryLabel(categories, p.category_id) : undefined
        }
        actions={
          <>
            {p && (
              <a
                href={`${publicBase}/en/order?item=${p.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <Icon name="external" className="size-4" />
                See it on the site
              </a>
            )}
            <Link href="/admin/menu" className="btn btn-ghost">
              Back to the menu
            </Link>
          </>
        }
      />
      <ItemForm item={values} categories={categoryChoices} groups={groups} templates={templates} />
      {p && (
        <section className="card mt-6 p-5">
          <h2 className="mb-2 text-base font-bold">History</h2>
          <History entries={(history?.data ?? []) as HistoryEntry[]} />
        </section>
      )}
    </>
  );
}
