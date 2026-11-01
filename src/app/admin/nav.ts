import type { StaffRole } from "@/server/admin/session";

// The admin's sections, in sidebar order, each with the least role that may
// open it. Sections join this list as they're built.

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  minimum: StaffRole;
  /** The heading it sits under; items without one come first. */
  group?: string;
  /** Other paths that belong to this section. */
  also?: string[];
  /** A count beside the label (Health's problems). */
  badge?: { count: number; tone: "bad" | "wait" };
};

export type NavIcon =
  | "home"
  | "orders"
  | "customers"
  | "dishes"
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
  {
    href: "/admin/menu",
    label: "Menu",
    icon: "dishes",
    minimum: "staff",
    group: "Sell",
    also: ["/admin/bundles", "/admin/prices"],
  },
  { href: "/admin/offers", label: "Offers", icon: "offers", minimum: "manager", group: "Sell" },
  {
    href: "/admin/store",
    label: "Store",
    icon: "store",
    minimum: "manager",
    group: "Run the shop",
  },
  {
    href: "/admin/site",
    label: "Website",
    icon: "site",
    minimum: "manager",
    group: "Run the shop",
  },
  {
    href: "/admin/ads",
    label: "Ad tools",
    icon: "ads",
    minimum: "manager",
    group: "Grow & manage",
  },
  {
    href: "/admin/health",
    label: "Health",
    icon: "health",
    minimum: "manager",
    group: "Grow & manage",
  },
  { href: "/admin/team", label: "Team", icon: "team", minimum: "owner", group: "Grow & manage" },
];

export const accountItem: NavItem = {
  href: "/admin/account",
  label: "Your account",
  icon: "account",
  minimum: "staff",
};
