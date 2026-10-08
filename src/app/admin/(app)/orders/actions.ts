"use server";

import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";

// Moving orders along: any staff member. The database checks each step
// (forward only, the right steps for pickup or delivery, nothing after
// completed or cancelled) and stamps its time; the audit log records who.

type Result = { error: string | null };

const steps = z.enum(["preparing", "ready", "out_for_delivery", "completed"]);

const friendly = (message: string) =>
  message.includes("is final") || message.includes("back to")
    ? "Someone already moved this order. The board shows where it is now."
    : "That didn’t save. Check the connection and try again.";

async function update(id: string, change: Database["public"]["Tables"]["orders"]["Update"]) {
  const db = await adminClient();
  const { data, error } = await db.from("orders").update(change).eq("id", id).select("id");
  if (error) return { error: friendly(error.message) };
  if (data.length === 0) return { error: "That order wasn’t found." };
  return { error: null };
}

/** The next step: preparing, ready or out for delivery, then completed (and paid). */
export async function advanceOrder(id: string, to: string): Promise<Result> {
  await requireStaff();
  const status = steps.parse(to);
  return update(z.uuid().parse(id), {
    status,
    // Both payment methods are settled in cash when the order is handed over.
    ...(status === "completed" ? { payment_status: "paid" as const } : {}),
  });
}

export async function cancelOrder(id: string, reason: string): Promise<Result> {
  await requireStaff();
  const text = z.string().trim().min(1).max(200).safeParse(reason);
  if (!text.success) return { error: "Say why it’s cancelled (up to 200 characters)." };
  return update(z.uuid().parse(id), { status: "cancelled", cancel_reason: text.data });
}
