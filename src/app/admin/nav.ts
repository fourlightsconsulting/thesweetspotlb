import type { StaffRole } from "@/server/admin/session";

// The admin's sections, in sidebar order, each with the least role that may
// open it. Sections join this list as they're built.

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  minimum: StaffRole;
  /** A count beside the label (Health's problems). */
  badge?: { count: number; tone: "bad" | "wait" };
};

export type NavIcon =
  | "home"
  | "orders"
  | "customers"
  | "dishes"
  | "bundles"
  | "prices"
  | "offers"
  | "site"
  | "store"
  | "ads"
  | "health"
  | "team"
  | "account";

export const navItems: NavItem[] = [
  { href: "/admin", label: "Home", icon: "home", minimum: "manager" },
  { href: "/admin/orders", label: "Orders", icon: "orders", minimum: "staff" },
  { href: "/admin/customers", label: "Customers", icon: "customers", minimum: "staff" },
  { href: "/admin/menu", label: "Menu", icon: "dishes", minimum: "staff" },
  { href: "/admin/bundles", label: "Bundles", icon: "bundles", minimum: "manager" },
  { href: "/admin/prices", label: "Prices", icon: "prices", minimum: "manager" },
  { href: "/admin/offers", label: "Offers", icon: "offers", minimum: "manager" },
  { href: "/admin/site", label: "Site", icon: "site", minimum: "manager" },
  { href: "/admin/store", label: "Store", icon: "store", minimum: "manager" },
  { href: "/admin/ads", label: "Ad tools", icon: "ads", minimum: "manager" },
  { href: "/admin/health", label: "Health", icon: "health", minimum: "manager" },
  { href: "/admin/team", label: "Team", icon: "team", minimum: "owner" },
];

export const accountItem: NavItem = {
  href: "/admin/account",
  label: "Your account",
  icon: "account",
  minimum: "staff",
};
