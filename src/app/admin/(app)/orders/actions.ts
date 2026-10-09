"use server";

import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";

// Cancelling an order: any staff member. Orders are completed once placed;
// the database stamps the time and the audit log records who.

type Result = { error: string | null };

const friendly = (message: string) =>
  message.includes("is final")
    ? "This order was already cancelled."
    : "That didn’t save. Check the connection and try again.";

async function update(id: string, change: Database["public"]["Tables"]["orders"]["Update"]) {
  const db = await adminClient();
  const { data, error } = await db.from("orders").update(change).eq("id", id).select("id");
  if (error) return { error: friendly(error.message) };
  if (data.length === 0) return { error: "That order wasn’t found." };
  return { error: null };
}

export async function cancelOrder(id: string, reason: string): Promise<Result> {
  await requireStaff();
  const text = z.string().trim().min(1).max(200).safeParse(reason);
  if (!text.success) return { error: "Say why it’s cancelled (up to 200 characters)." };
  return update(z.uuid().parse(id), { status: "cancelled", cancel_reason: text.data });
}
