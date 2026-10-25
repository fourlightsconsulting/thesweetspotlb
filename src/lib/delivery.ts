import type { DeliveryArea } from "@/data/ordering";

type AreaWithZoneFee = {
  slug: string;
  name_en: string;
  name_ar: string;
  delivery_zones: { fee_cents: number };
};

/** Only area names and inherited fees reach the storefront, never zone names. */
export function checkoutAreas(areas: AreaWithZoneFee[]): DeliveryArea[] {
  return areas.map((area) => ({
    id: area.slug,
    name: { en: area.name_en, ar: area.name_ar },
    fee: area.delivery_zones.fee_cents,
  }));
}
