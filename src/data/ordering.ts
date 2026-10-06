// Ordering rules for the Tripoli branch: drafts from the design handoff, to
// confirm with the client before launch. They move to Supabase (branches,
// delivery zones, settings) once the admin side exists.
import type { Localized } from "./menu";

export type Fulfilment = "pickup" | "delivery";

export const ordering = {
  /** Lead time shown to customers, in minutes: [from, to]. */
  eta: { pickup: [10, 15], delivery: [30, 45] } satisfies Record<Fulfilment, [number, number]>,
  /** Online orders stop this many minutes before closing time. ASAP orders only, no scheduling. */
  lastOrderMinutes: 15,
  /** Per line. */
  maxQuantity: 20,
  maxLines: 30,
  noteMaxLength: 140,
};

export type DeliveryZone = { id: string; name: Localized; fee: number };

/** Areas we deliver to, with the fee in cents. */
export const deliveryZones: DeliveryZone[] = [
  { id: "mina", name: { en: "Mina", ar: "الميناء" }, fee: 200 },
  { id: "tal", name: { en: "Tal", ar: "التل" }, fee: 200 },
  { id: "azmi", name: { en: "Azmi", ar: "شارع عزمي" }, fee: 200 },
  { id: "dam-w-farez", name: { en: "Dam w Farez", ar: "الضم والفرز" }, fee: 200 },
  { id: "abou-samra", name: { en: "Abou Samra", ar: "أبي سمراء" }, fee: 200 },
  { id: "bahsas", name: { en: "Bahsas", ar: "البحصاص" }, fee: 200 },
];

/** The lowest delivery fee, and whether every area pays the same. */
export const deliveryFeeFrom = Math.min(...deliveryZones.map((z) => z.fee));
export const deliveryFeeIsFlat = deliveryZones.every((z) => z.fee === deliveryFeeFrom);
