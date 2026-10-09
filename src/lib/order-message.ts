import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill } from "@/i18n/format";
import type { PlacedOrder } from "./checkout";
import { formatPrice } from "./money";
import { formatPhoneLocal } from "./phone";

// The order as a WhatsApp message the customer sends to the shop as soon as
// they place it: the shop gets every order in the WhatsApp it already has
// open, without paid business alerts. In the customer's language, one detail
// per line, each item's choices as a list ("- "), and the order number in
// bold (*…*) so staff can find it in the admin.

type Labels = Pick<Dictionary["order"], "subtotal" | "deliveryFee" | "discount" | "total">;

export function orderMessage(
  order: PlacedOrder,
  lang: Locale,
  t: Dictionary["whatsappOrder"],
  labels: Labels,
) {
  const money = (cents: number) => formatPrice(cents, lang);
  const { address, totals } = order;
  // Arabic text would reorder the number's groups; an isolate keeps it as typed.
  const phone = `+961 ${formatPhoneLocal(order.phone)}`;

  const customer = [
    `${t.name}: ${order.name}`,
    `${t.phone}: ${lang === "ar" ? `⁦${phone}⁩` : phone}`,
    address
      ? `${t.address}: ${[address.zone[lang], address.street, address.floor]
          .filter(Boolean)
          .join(lang === "ar" ? "، " : ", ")}`
      : t.pickup,
    ...(address?.note ? [`${t.driverNote}: ${address.note}`] : []),
  ];

  const items = order.lines.flatMap((line) => [
    `${line.qty} × ${line.name[lang]}`,
    ...line.options[lang].map((option) => `- ${option}`),
    ...(line.note ? [`- ${fill(t.note, { note: line.note })}`] : []),
  ]);

  const sums = [
    `${labels.subtotal}: ${money(totals.subtotal)}`,
    ...(totals.discount > 0
      ? [
          `${labels.discount}${order.promoCode ? ` (${order.promoCode})` : ""}: ${money(-totals.discount)}`,
        ]
      : []),
    ...(totals.deliveryFee > 0 ? [`${labels.deliveryFee}: ${money(totals.deliveryFee)}`] : []),
    `*${labels.total}: ${money(totals.total)}*`,
  ];

  return [
    fill(t.greeting, { number: `*${order.number}*` }),
    "",
    ...customer,
    "",
    ...items,
    "",
    ...sums,
  ].join("\n");
}

/** A WhatsApp chat with an E.164 number, with the message typed in. */
export const whatsappMessageUrl = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
