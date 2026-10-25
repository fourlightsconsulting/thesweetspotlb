// Ordering limits, and the Tripoli branch's ETAs and delivery areas as
// built-in fallbacks. The live ETAs, areas, fees and hours come from Supabase
// (branches, delivery_zones, delivery_areas; see src/server/catalog.ts) and are edited in the
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

export type DeliveryArea = { id: string; name: Localized; fee: number };

/** Built-in Zone A; the database owns the live zones and their areas. */
export const deliveryZones = [
  {
    name: "Zone A",
    fee: 200,
    areas: [
      { id: "mina", name: { en: "Mina", ar: "الميناء" } },
      { id: "tal", name: { en: "Tal", ar: "التل" } },
      { id: "azmi", name: { en: "Azmi", ar: "شارع عزمي" } },
      { id: "dam-w-farez", name: { en: "Dam w Farez", ar: "الضم والفرز" } },
      { id: "abou-samra", name: { en: "Abou Samra", ar: "أبي سمراء" } },
      { id: "bahsas", name: { en: "Bahsas", ar: "البحصاص" } },
    ],
  },
];

export const deliveryAreas: DeliveryArea[] = deliveryZones.flatMap((zone) =>
  zone.areas.map((area) => ({ ...area, fee: zone.fee })),
);

/** What the order and checkout pages know about the branch taking orders. */
export type OrderingInfo = {
  schedule: Schedule;
  /** Lead time shown to customers, in minutes: [from, to]. */
  eta: Record<Fulfilment, [number, number]>;
  areas: DeliveryArea[];
};
