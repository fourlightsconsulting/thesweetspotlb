import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { storeStatus } from "@/lib/hours";
import { adminClient } from "@/lib/supabase/server";
import { getOrderingBranch } from "@/server/catalog";
import { requireStaff } from "@/server/admin/session";

export const metadata: Metadata = { title: "Home" };

/** Midnight today in Beirut, as an ISO timestamp. */
function startOfBeirutDay(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(now);
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Beirut",
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "");
  return new Date(`${date}T00:00:00${offset || "+00:00"}`).toISOString();
}

export default async function AdminHome() {
  const staff = await requireStaff();
  const db = await adminClient();
  const since = startOfBeirutDay();

  const [today, waiting, branch] = await Promise.all([
    db.from("orders").select("total_cents, status").gte("placed_at", since),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "received"),
    getOrderingBranch(),
  ]);
  const orders = (today.data ?? []).filter((o) => o.status !== "cancelled");
  const revenue = orders.reduce((sum, o) => sum + Number(o.total_cents), 0);
  const status = storeStatus(branch.schedule);

  const tiles = [
    { label: "Orders today", value: String(orders.length) },
    { label: "Sales today", value: `$${(revenue / 100).toFixed(2)}` },
    {
      label: "Waiting to start",
      value: String(waiting.count ?? 0),
      tone: (waiting.count ?? 0) > 0 ? "text-wait" : "",
    },
    {
      label: "Online ordering",
      value: branch.schedule.paused ? "Paused" : status.open ? "Open" : "Closed",
      tone: status.open ? "text-good" : "text-muted",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${staff.name.split(" ")[0]}`}
        description="Today at the Tripoli branch, in Beirut time."
      />
      <div className="grid grid-cols-2 gap-3 wide:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-[13px] text-muted">{tile.label}</p>
            <p className={`mt-1 text-2xl leading-8 font-bold tabular-nums ${tile.tone ?? ""}`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
