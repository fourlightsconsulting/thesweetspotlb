// The dashboard's tabs, shared by the page (a server component) and its
// controls (a client component), so it lives outside both.

export const dashboardTabs = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "marketing", label: "Marketing" },
  { key: "web", label: "Website" },
] as const;

export type DashboardTab = (typeof dashboardTabs)[number]["key"];
