"use client";

import { usePathname } from "next/navigation";
import { PageTabs } from "@/components/admin/page-tabs";

const tabs = [
  { href: "/admin/menu", label: "Items" },
  { href: "/admin/bundles", label: "Bundles" },
  { href: "/admin/menu/choices", label: "Choices & add-ons" },
  { href: "/admin/menu/categories", label: "Categories" },
  { href: "/admin/prices", label: "Prices" },
];

/** The menu section's own tabs (managers; staff only see items). */
export function MenuTabs() {
  const pathname = usePathname();
  const current =
    tabs
      .slice(1)
      .find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href ??
    tabs[0].href;
  return <PageTabs label="Menu sections" tabs={tabs} current={current} />;
}
