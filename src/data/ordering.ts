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

/** Built-in rates for local checkout. The database owns the live list. */
export const deliveryZones = [
  {
    name: "Zone A",
    fee: 100,
    areas: [
      { id: "dam-w-farez", name: { en: "Dam w Farez", ar: "الضم والفرز" } },
      { id: "boulevard", name: { en: "Boulevard", ar: "البوليفار" } },
      { id: "bahsas", name: { en: "Bahsas", ar: "البحصاص" } },
    ],
  },
  {
    name: "Zone B",
    fee: 150,
    areas: [
      { id: "mharam", name: { en: "Mharam", ar: "المحرّم" } },
      { id: "beb-ramel", name: { en: "Beb Ramel", ar: "باب الرمل" } },
      { id: "sehet-lnour", name: { en: "Sehet Lnour", ar: "ساحة النور" } },
      { id: "douwar-nini", name: { en: "Douwar Nini", ar: "دوّار النيني" } },
      { id: "maarad", name: { en: "Maarad", ar: "المعرض" } },
    ],
  },
  {
    name: "Zone C",
    fee: 200,
    areas: [
      { id: "naji", name: { en: "Naji", ar: "ناجي" } },
      { id: "palma", name: { en: "Palma", ar: "بالما" } },
      { id: "haykaliye", name: { en: "Haykaliye", ar: "الهيكلية" } },
      { id: "abou-samra", name: { en: "Abu Samra", ar: "أبي سمراء" } },
      { id: "tal", name: { en: "Tal", ar: "التل" } },
      { id: "seht-nejme", name: { en: "Seht Nejme", ar: "ساحة النجمة" } },
      { id: "azmi", name: { en: "Azmi", ar: "شارع عزمي" } },
      { id: "200-street", name: { en: "200 Street", ar: "شارع الـ200" } },
      { id: "jamil-adra", name: { en: "Jamil Adra", ar: "جميل عدرا" } },
      { id: "nakabet-ateba2", name: { en: "Nakabet Ateba2", ar: "نقابة الأطباء" } },
      { id: "mina", name: { en: "Mina", ar: "الميناء" } },
      { id: "tari2-mina", name: { en: "Tari2 Mina", ar: "طريق الميناء" } },
    ],
  },
  {
    name: "Zone D",
    fee: 250,
    areas: [
      { id: "mina-baher", name: { en: "Mina (Baher)", ar: "الميناء (البحر)" } },
      { id: "mina-groupy", name: { en: "Mina (Groupy)", ar: "الميناء (غروبي)" } },
      { id: "daher-eiin", name: { en: "Daher Eiin", ar: "ضهر العين" } },
      { id: "north-marina", name: { en: "North Marina", ar: "نورث مارينا" } },
      { id: "kanaes-street", name: { en: "Kanaes Street", ar: "شارع الكنائس" } },
      { id: "zehriye", name: { en: "Zehriye", ar: "الزاهرية" } },
      { id: "ponto-alto", name: { en: "Ponto Alto", ar: "بونتو ألتو" } },
    ],
  },
  {
    name: "Zone E",
    fee: 300,
    areas: [
      { id: "abu-samra-shalfe", name: { en: "Abu Samra (Shalfe)", ar: "أبي سمراء (الشلفة)" } },
      {
        id: "abu-samra-seke-bayda",
        name: { en: "Abu Samra (Seke Bayda)", ar: "أبي سمراء (السكة البيضا)" },
      },
      { id: "abu-samra-wadihab", name: { en: "Abu Samra (Wadihab)", ar: "أبي سمراء (وادي هاب)" } },
      { id: "abu-samra-islah", name: { en: "Abu Samra (Islah)", ar: "أبي سمراء (الإصلاح)" } },
      { id: "abu-samra-safa", name: { en: "Abu Samra (Safa)", ar: "أبي سمراء (الصفا)" } },
      { id: "abu-samra-jinan", name: { en: "Abu Samra (Jinan)", ar: "أبي سمراء (الجنان)" } },
      { id: "tebeneh", name: { en: "Tebeneh", ar: "التبانة" } },
      { id: "duwar-abu-ali", name: { en: "Duwar Abu Ali", ar: "دوّار أبو علي" } },
      { id: "ras-maska", name: { en: "Ras Maska", ar: "رأس مسقا" } },
      { id: "hara-beraeshiye", name: { en: "Hara Beraeshiye", ar: "حارة البراشية" } },
    ],
  },
  {
    name: "Zone F",
    fee: 350,
    areas: [
      { id: "kalamoun", name: { en: "Kalamoun", ar: "القلمون" } },
      { id: "ebbe", name: { en: "Ebbe", ar: "القبة" } },
      { id: "daher-eiin-ba3d-sea", name: { en: "Daher Eiin Ba3d Sea", ar: "ضهر العين بعد Sea" } },
      { id: "barsa", name: { en: "Barsa", ar: "برسا" } },
      { id: "barad-chami", name: { en: "Barad Chami", ar: "برّاد الشامي" } },
      { id: "bader-hasun", name: { en: "Bader Hasun", ar: "بدر حسّون" } },
    ],
  },
  {
    name: "Zone G",
    fee: 400,
    areas: [
      { id: "jabal-mehsen", name: { en: "Jabal Mehsen", ar: "جبل محسن" } },
      { id: "samriye", name: { en: "Samriye", ar: "السمرية" } },
    ],
  },
  {
    name: "Zone H",
    fee: 450,
    areas: [
      { id: "malule", name: { en: "Malule", ar: "الملولة" } },
      { id: "mankubin", name: { en: "Mankubin", ar: "المنكوبين" } },
      { id: "bedewi", name: { en: "Bedewi", ar: "البداوي" } },
      { id: "dedeh", name: { en: "Dedeh", ar: "ددّه" } },
      { id: "dar-nour", name: { en: "Dar Nour", ar: "دار النور" } },
      { id: "hara-khasa", name: { en: "Hara Khasa", ar: "حارة خاصة" } },
      { id: "nakhle", name: { en: "Nakhle", ar: "النخلة" } },
      { id: "btouratij", name: { en: "Btouratij", ar: "بتوراتيج" } },
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
