import type { StaffRole } from "@/server/admin/session";

// The admin's sections, in sidebar order, each with the least role that may
// open it. Sections join this list as they're built.

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  minimum: StaffRole;
};

export type NavIcon = "home" | "team" | "account";

export const navItems: NavItem[] = [
  { href: "/admin", label: "Home", icon: "home", minimum: "staff" },
  { href: "/admin/team", label: "Team", icon: "team", minimum: "owner" },
];

export const accountItem: NavItem = {
  href: "/admin/account",
  label: "Your account",
  icon: "account",
  minimum: "staff",
};
