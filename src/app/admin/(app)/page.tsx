import type { Metadata } from "next";
import { startOfBeirutDay } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { storeStatus } from "@/lib/hours";
import { adminClient } from "@/lib/supabase/server";
import { getOrderingBranch } from "@/server/catalog";
import { atLeast, requireStaff } from "@/server/admin/session";
import { orderingNote } from "./store/ordering-note";
import { OrderingSwitch } from "./store/ordering-switch";

export const metadata: Metadata = { title: "Home" };

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

  const tiles = [
    { label: "Orders today", value: String(orders.length) },
    { label: "Sales today", value: `$${(revenue / 100).toFixed(2)}` },
    {
      label: "Waiting to start",
      value: String(waiting.count ?? 0),
      tone: (waiting.count ?? 0) > 0 ? "text-wait" : "",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${staff.name.split(" ")[0]}`}
        description="Today at the Tripoli branch, in Beirut time."
      />
      <div className="grid grid-cols-2 gap-3 wide:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-[13px] text-muted">{tile.label}</p>
            <p className={`mt-1 text-2xl leading-8 font-bold tabular-nums ${tile.tone ?? ""}`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <OrderingSwitch
          value={branch.schedule.ordering}
          open={storeStatus(branch.schedule).open}
          note={orderingNote(branch.schedule)}
          canChange={atLeast(staff.role, "manager")}
        />
      </div>
    </>
  );
}
