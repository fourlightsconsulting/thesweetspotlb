// Ordering limits, and the Tripoli branch's ETAs and delivery zones as
// built-in fallbacks. The live ETAs, zones, fees and hours come from Supabase
// (branches, delivery_zones; see src/server/catalog.ts) and are edited in the
// admin. Online orders are ASAP only, no scheduling.
import type { Schedule } from "@/lib/hours";
import type { Localized } from "./menu";

export type Fulfilment = "pickup" | "delivery";

export const ordering = {
  /** Lead time shown to customers, in minutes: [from, to]. */
  eta: { pickup: [10, 15], delivery: [30, 45] } as Record<Fulfilment, [number, number]>,
  /** Per line. */
  maxQuantity: 20,
  maxLines: 30,
  noteMaxLength: 140,
};

export type DeliveryZone = { id: string; name: Localized; fee: number };

/** Areas we deliver to, with the fee in cents (built-in fallback). */
export const deliveryZones: DeliveryZone[] = [
  { id: "mina", name: { en: "Mina", ar: "الميناء" }, fee: 200 },
  { id: "tal", name: { en: "Tal", ar: "التل" }, fee: 200 },
  { id: "azmi", name: { en: "Azmi", ar: "شارع عزمي" }, fee: 200 },
  { id: "dam-w-farez", name: { en: "Dam w Farez", ar: "الضم والفرز" }, fee: 200 },
  { id: "abou-samra", name: { en: "Abou Samra", ar: "أبي سمراء" }, fee: 200 },
  { id: "bahsas", name: { en: "Bahsas", ar: "البحصاص" }, fee: 200 },
];

/** The lowest delivery fee, and whether every area pays the same. */
export function deliveryFees(zones: DeliveryZone[]) {
  const from = zones.length > 0 ? Math.min(...zones.map((z) => z.fee)) : 0;
  return { from, flat: zones.every((z) => z.fee === from) };
}

/** What the order and checkout pages know about the branch taking orders. */
export type OrderingInfo = {
  schedule: Schedule;
  /** Lead time shown to customers, in minutes: [from, to]. */
  eta: Record<Fulfilment, [number, number]>;
  zones: DeliveryZone[];
};
