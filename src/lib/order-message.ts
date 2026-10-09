import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill } from "@/i18n/format";
import type { PlacedOrder } from "./checkout";
import { formatPrice } from "./money";
import { formatPhoneLocal } from "./phone";

// The order as a WhatsApp message the customer sends to the shop from the
// confirmation page: the shop gets every order in the WhatsApp it already
// has open, without paid business alerts. In the customer's language, with
// the order number in bold (*…*) so staff can find it on the Orders board.

type Labels = Pick<Dictionary["order"], "subtotal" | "deliveryFee" | "discount" | "total">;

export function orderMessage(
  order: PlacedOrder,
  lang: Locale,
  t: Dictionary["whatsappOrder"],
  labels: Labels,
) {
  const money = (cents: number) => formatPrice(cents, lang);
  const { totals } = order;
  const delivery = order.mode === "delivery";
  const comma = lang === "ar" ? "، " : ", ";

  const items = order.lines.flatMap((line) => [
    `${line.qty} × ${line.name[lang]}`,
    ...(line.options[lang] ? [`   ${line.options[lang]}`] : []),
    ...(line.note ? [`   ${fill(t.note, { note: line.note })}`] : []),
  ]);

  const sums = [
    `${labels.subtotal}: ${money(totals.subtotal)}`,
    ...(totals.discount > 0
      ? [
          `${labels.discount}${order.promoCode ? ` (${order.promoCode})` : ""}: ${money(-totals.discount)}`,
        ]
      : []),
    ...(totals.deliveryFee > 0 ? [`${labels.deliveryFee}: ${money(totals.deliveryFee)}`] : []),
    `*${labels.total}: ${money(totals.total)}*${comma}${delivery ? t.payCod : t.payPickup}`,
  ];

  const where = order.address
    ? fill(t.delivery, {
        address: [order.address.zone[lang], order.address.street, order.address.floor]
          .filter(Boolean)
          .join(comma),
      })
    : t.pickup;

  return [
    fill(t.greeting, { number: `*${order.number}*` }),
    "",
    ...items,
    "",
    ...sums,
    "",
    where,
    `${order.name} · +961 ${formatPhoneLocal(order.phone)}`,
  ].join("\n");
}

/** A WhatsApp chat with an E.164 number, with the message typed in. */
export const whatsappMessageUrl = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
