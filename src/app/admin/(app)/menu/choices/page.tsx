import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { ruleLabel } from "@/lib/item-groups";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { MenuTabs } from "../menu-tabs";

export const metadata: Metadata = { title: "Choices & add-ons" };

export default async function ChoicesPage() {
  await requireStaff("manager");
  const db = await adminClient();
  const { data, error } = await db
    .from("option_groups")
    .select(
      "id, name_en, min_select, max_select, options(name_en, is_available, sort_order), product_option_groups(product_id)",
    )
    .eq("kind", "options")
    .order("name_en");
  if (error) throw new Error(`Loading the choices failed: ${error.message}`);

  return (
    <>
      <PageHeader
        title="Menu"
        help="Templates for groups of choices (sauces, toppings). Add one to an item from that item’s page. Items follow their template until you change something on the item."
        actions={
          <Link href="/admin/menu/choices/new" className="btn btn-primary">
            <Icon name="plus" className="size-4" />
            Add a template
          </Link>
        }
      />
      <MenuTabs />
      {data.length === 0 ? (
        <p className="text-muted">No templates yet.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {data.map((group) => {
            const choices = [...group.options].sort((a, b) => a.sort_order - b.sort_order);
            const soldOut = choices.filter((c) => !c.is_available).length;
            const items = group.product_option_groups.length;
            return (
              <li key={group.id}>
                <Link
                  href={`/admin/menu/choices/${group.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-tint"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{group.name_en}</span>
                      {soldOut > 0 && (
                        <span className="pill bg-bad-soft text-bad">{soldOut} sold out</span>
                      )}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {choices.map((c) => c.name_en).join(", ") || "No choices yet"}
                    </span>
                  </span>
                  <span className="hidden w-44 text-[13px] text-muted sm:block">
                    {ruleLabel({ min: group.min_select, max: group.max_select })}
                  </span>
                  <span className="w-20 text-end text-[13px] text-muted tabular-nums">
                    {items === 0 ? "Not in use" : `${items} item${items === 1 ? "" : "s"}`}
                  </span>
                  <Icon name="chevron" className="size-4 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
