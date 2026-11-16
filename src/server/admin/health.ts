import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { getOrderingBranch, getSiteSettings } from "@/server/catalog";
import { metaCapiConfigured } from "@/server/meta-capi";
import { whatsappConfig } from "@/server/whatsapp";
import { type Attention, type AttentionCounts, attentionItems } from "./attention";

/** The current alerts for the Health overview. */
export async function needsAttention(): Promise<Attention> {
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
}
