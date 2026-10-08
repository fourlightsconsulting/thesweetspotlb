"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags } from "@/server/catalog";
import { requireStaff } from "@/server/admin/session";

// Price changes from the grid, saved together. Each change is logged (with
// who made it) by the audit trigger, which the page shows as the price log.

const changes = z
  .array(
    z.object({
      kind: z.enum(["product", "option"]),
      id: z.uuid(),
      cents: z.number().int().min(0).max(1_000_000),
    }),
  )
  .min(1)
  .max(500);

export async function savePrices(input: unknown): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const parsed = changes.safeParse(input);
  if (!parsed.success) return { error: "Some prices aren’t valid amounts." };

  const db = await adminClient();
  const results = await Promise.all(
    parsed.data.map((c) =>
      c.kind === "product"
        ? db.from("products").update({ price_cents: c.cents }).eq("id", c.id)
        : db.from("options").update({ price_cents: c.cents }).eq("id", c.id),
    ),
  );
  updateTag(catalogTags.menu);
  const failedCount = results.filter((r) => r.error).length;
  return failedCount
    ? { error: `${failedCount} of ${results.length} prices didn’t save. Try again.` }
    : { error: null };
}
