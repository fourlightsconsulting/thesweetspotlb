"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/menu", label: "Items" },
  { href: "/admin/menu/categories", label: "Categories" },
  { href: "/admin/menu/choices", label: "Choices & add-ons" },
];

/** The menu section's own tabs (managers; staff only see items). */
export function MenuTabs() {
  const pathname = usePathname();
  const active = pathname.startsWith("/admin/menu/categories")
    ? "/admin/menu/categories"
    : pathname.startsWith("/admin/menu/choices")
      ? "/admin/menu/choices"
      : "/admin/menu";
  return (
    <nav aria-label="Menu sections" className="mb-6 flex gap-1 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className="-mb-px border-b-2 border-transparent px-3 py-2 font-semibold text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
