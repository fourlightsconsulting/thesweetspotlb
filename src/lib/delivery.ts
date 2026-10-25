import type { DeliveryArea } from "@/data/ordering";

type AreaWithZoneFee = {
  slug: string;
  name_en: string;
  name_ar: string;
  delivery_zones: { fee_cents: number; sort_order: number };
};

/** Only area names and inherited fees reach the storefront, never zone names. */
export function checkoutAreas(areas: AreaWithZoneFee[]): DeliveryArea[] {
  return [...areas]
    .sort((a, b) => a.delivery_zones.sort_order - b.delivery_zones.sort_order)
    .map((area) => ({
      id: area.slug,
      name: { en: area.name_en, ar: area.name_ar },
      fee: area.delivery_zones.fee_cents,
    }));
}
