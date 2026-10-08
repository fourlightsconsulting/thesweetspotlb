import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { MenuTabs } from "../menu-tabs";
import { type Group, GroupCard, NewGroup } from "./choice-forms";

export const metadata: Metadata = { title: "Choices & add-ons" };

export default async function ChoicesPage() {
  await requireStaff("manager");
  const db = await adminClient();
  const { data, error } = await db
    .from("option_groups")
    .select(
      "id, name_en, name_ar, min_select, max_select, options(id, name_en, name_ar, price_cents, is_available, sort_order), product_option_groups(products(name_en))",
    )
    .eq("kind", "options")
    .order("name_en");
  if (error) throw new Error(`Loading the choices failed: ${error.message}`);

  const groups: Group[] = data.map((g) => ({
    id: g.id,
    nameEn: g.name_en,
    nameAr: g.name_ar,
    min: g.min_select,
    max: g.max_select,
    usedBy: g.product_option_groups.flatMap((l) => (l.products ? [l.products.name_en] : [])),
    choices: [...g.options]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({
        id: o.id,
        nameEn: o.name_en,
        nameAr: o.name_ar,
        price: o.price_cents,
        available: o.is_available,
      })),
  }));

  return (
    <>
      <PageHeader
        title="Menu"
        description="Groups of choices (sauces, sticks, toppings) and their prices. Add a group to items from each item’s page."
      />
      <MenuTabs />
      <div className="mb-4">
        <NewGroup />
      </div>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </>
  );
}
