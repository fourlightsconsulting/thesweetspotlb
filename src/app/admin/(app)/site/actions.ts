"use server";

import { updateTag } from "next/cache";
import type { Json } from "@/lib/supabase/database.types";
import { homeTickerSchema, siteSettingKeys, welcomePopupSchema } from "@/lib/site-settings";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags } from "@/server/catalog";
import { requireStaff } from "@/server/admin/session";

// Website content from the admin: the home ticker and the welcome popup.
// The same schemas check them here and again when the website reads them.

type Result = { error: string | null };

async function store(key: string, value: Json): Promise<Result> {
  const db = await adminClient();
  const { error } = await db.from("site_settings").upsert({ key, value, is_public: true });
  if (error) return { error: "That didn’t save. Try again." };
  updateTag(catalogTags.settings);
  return { error: null };
}

export async function saveTicker(input: unknown): Promise<Result> {
  await requireStaff("manager");
  const parsed = homeTickerSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Each phrase needs English and Arabic, up to 40 characters; 1 to 8 phrases." };
  return store(siteSettingKeys.homeTicker, parsed.data);
}

export async function savePopup(input: unknown): Promise<Result> {
  await requireStaff("manager");
  const parsed = welcomePopupSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const messages: Record<string, string> = {
      title: "Give it a title in English and Arabic (up to 70 characters).",
      body: "Write the message in English and Arabic (up to 240 characters).",
      code: "Codes are 3–24 capital letters and numbers.",
      cta: "The button needs a label in both languages and somewhere to go (links start with https://).",
      delay_seconds: "The delay is 0 to 60 seconds.",
      repeat_after_days: "Show it again after 1 to 365 days.",
    };
    return { error: messages[field] ?? "Check the popup’s fields." };
  }
  const popup = parsed.data;

  // An offer for a code that doesn't work would only disappoint.
  if (popup.enabled && popup.code) {
    const db = await adminClient();
    const { data } = await db
      .from("discount_codes")
      .select("is_active, ends_at")
      .eq("code", popup.code)
      .maybeSingle();
    if (!data?.is_active || (data.ends_at && new Date(data.ends_at) < new Date()))
      return {
        error: `${popup.code} isn’t a live code. Create or switch it on under Offers first.`,
      };
  }
  return store(siteSettingKeys.welcomePopup, popup);
}

/** The website's own visitor records on or off (the ad platforms' tags carry on). */
export async function saveTracking(firstParty: boolean): Promise<Result> {
  await requireStaff("manager");
  return store(siteSettingKeys.tracking, { first_party: firstParty === true });
}
