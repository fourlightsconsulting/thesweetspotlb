"use server";

import { updateTag } from "next/cache";
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
