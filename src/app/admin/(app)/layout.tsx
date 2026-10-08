import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { atLeast, requireStaff } from "@/server/admin/session";
import { accountItem, navItems } from "../nav";

// Every admin page except sign-in: staff only, inside the shell.
export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  const items = navItems.filter((item) => atLeast(staff.role, item.minimum));

  return (
    <AdminShell items={items} account={accountItem} staff={{ name: staff.name, role: staff.role }}>
      {children}
    </AdminShell>
  );
}
