import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { needsAttention } from "@/server/admin/health";
import { atLeast, requireStaff } from "@/server/admin/session";
import { accountItem, navItems } from "../nav";

// Every admin page except sign-in: staff only, inside the shell.
export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  let items = navItems.filter((item) => atLeast(staff.role, item.minimum));
  // Managers see how many things need a look beside Health.
  if (atLeast(staff.role, "manager")) {
    const attention = await needsAttention().catch(() => []);
    if (attention.length > 0) {
      const badge = {
        count: attention.length,
        tone: attention.some((a) => a.tone === "bad") ? ("bad" as const) : ("wait" as const),
      };
      items = items.map((item) => (item.href === "/admin/health" ? { ...item, badge } : item));
    }
  }

  return (
    <AdminShell items={items} account={accountItem} staff={{ name: staff.name, role: staff.role }}>
      {children}
    </AdminShell>
  );
}
