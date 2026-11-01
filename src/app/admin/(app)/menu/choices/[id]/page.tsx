import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { TemplateForm, type TemplateValues } from "./template-form";

export const metadata: Metadata = { title: "Template" };

export default async function TemplatePage({
  params,
  searchParams,
}: PageProps<"/admin/menu/choices/[id]">) {
  await requireStaff("manager");
  const { id } = await params;
  const { created } = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const db = await adminClient();
  const group = isNew
    ? null
    : (
        await db
          .from("option_groups")
          .select(
            "id, name_en, name_ar, min_select, max_select, options(id, name_en, name_ar, price_cents, is_available, sort_order, product_options(price_cents)), product_option_groups(products(id, name_en))",
          )
          .eq("id", id)
          .eq("kind", "options")
          .maybeSingle()
      ).data;
  if (!isNew && !group) notFound();

  const values: TemplateValues = group
    ? {
        id: group.id,
        nameEn: group.name_en,
        nameAr: group.name_ar,
        min: group.min_select,
        max: group.max_select,
        choices: [...group.options]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((o) => ({
            id: o.id,
            nameEn: o.name_en,
            nameAr: o.name_ar,
            price: o.price_cents,
            available: o.is_available,
            ownPrices: o.product_options.filter((r) => r.price_cents !== null).length,
          })),
      }
    : { id: null, nameEn: "", nameAr: "", min: 0, max: 1, choices: [] };
  const usedBy = (group?.product_option_groups ?? [])
    .flatMap((l) => (l.products ? [{ id: l.products.id, name: l.products.name_en }] : []))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { href: "/admin/menu", label: "Menu" },
          { href: "/admin/menu/choices", label: "Choices & add-ons" },
        ]}
        title={group ? group.name_en : "New template"}
        description={created ? "Template added." : undefined}
        help="Items follow this template, except for anything changed on the item itself."
      />
      <TemplateForm template={values} usedBy={usedBy} />
    </>
  );
}
