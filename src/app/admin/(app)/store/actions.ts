"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { slugify } from "@/lib/slug";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags } from "@/server/catalog";
import { sendOrderAlerts } from "@/server/order-alerts";
import { failed, saved } from "@/server/admin/form-state";
import { requireStaff } from "@/server/admin/session";
import { parseStoreSettings } from "./store-settings";

/** One transaction saves the Store page, including all draft delivery edits. */
export async function saveStoreSettings(raw: unknown): Promise<FormState> {
  await requireStaff("manager");
  const parsed = parseStoreSettings(raw);
  if (!parsed.ok) return failed(parsed.error);
  const value = parsed.value;
  const db = await adminClient();
  const { error } = await db.rpc("save_store_settings", {
    payload: {
      ...value,
      areas: value.areas.map((area) => ({ ...area, slug: slugify(area.nameEn, "area") })),
    },
  });
  if (error)
    return failed(
      error.code === "23503"
        ? "An area with past orders can’t be removed. Switch it off instead, and move all areas out of any zone you remove."
        : error.code === "23505"
          ? "Zone names, area names and closed days must be unique."
          : "The store settings didn’t save. Your edits are still here; try again.",
    );
  updateTag(catalogTags.store);
  return saved();
}

/** The ordering switch takes effect at once: pausing can't wait for a save. */
export async function setOrdering(
  branchId: string,
  ordering: string,
): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const value = z.enum(["hours", "open", "paused"]).safeParse(ordering);
  if (!value.success) return { error: "That didn’t save. Try again." };
  const db = await adminClient();
  const { error } = await db
    .from("branches")
    .update({ ordering: value.data })
    .eq("id", z.uuid().parse(branchId));
  if (error) return { error: "That didn’t save. Try again." };
  updateTag(catalogTags.store);
  return { error: null };
}

/** Sending waiting alerts is an operation, separate from saving settings. */
export async function retryAlerts(): Promise<{ message: string }> {
  await requireStaff("manager");
  const result = await sendOrderAlerts();
  if (!result.configured) return { message: "WhatsApp isn’t connected yet, so alerts wait." };
  if (result.sent + result.failed === 0) return { message: "Nothing waiting to send." };
  return {
    message: `${result.sent} sent${result.failed ? `, ${result.failed} failed again` : ""}.`,
  };
}
