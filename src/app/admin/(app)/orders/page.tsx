import type { Metadata } from "next";
import { startOfBeirutDay } from "@/components/admin/format";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { OrderBoard } from "./board";
import { boardQuery } from "./data";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requireStaff();
  const db = await adminClient();
  const { data, error } = await boardQuery(db, startOfBeirutDay());
  if (error) throw new Error(`Loading the orders failed: ${error.message}`);
  return <OrderBoard initial={data} />;
}
