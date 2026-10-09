import "server-only";
import { cache } from "react";
import { adminClient } from "@/lib/supabase/server";
import { getOrderingBranch, getSiteSettings } from "@/server/catalog";
import { metaCapiConfigured } from "@/server/meta-capi";
import { whatsappConfig } from "@/server/whatsapp";
import { type Attention, type AttentionCounts, attentionItems } from "./attention";

/**
 * What a manager should look at now, once per request (the menu's badge and
 * the page share it); empty if it can't be worked out.
 */
export const needsAttention = cache(async (): Promise<Attention> => {
  const db = await adminClient();
  const [counts, branch, settings] = await Promise.all([
    db.rpc("health_attention"),
    getOrderingBranch(),
    getSiteSettings(),
  ]);
  if (counts.error || !counts.data) return [];
  return attentionItems(counts.data as AttentionCounts, {
    ordering: branch.schedule.ordering,
    firstParty: settings.tracking.first_party,
    whatsapp: whatsappConfig() !== null,
    metaCapi: metaCapiConfigured(),
  });
});
