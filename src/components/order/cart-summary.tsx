"use client";

import { useEffect } from "react";
import type { Menu } from "@/data/menu";
import { ordering } from "@/data/ordering";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill } from "@/i18n/format";
import { track } from "@/lib/tracking";
import { type CartLine, cartActions, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { describeSelections, priceLines, type Totals } from "@/lib/pricing";
import { ItemImage } from "./item-image";
import { QtyStepper } from "./qty-stepper";

/** The cart, priced against the current menu. Lines it can no longer price are dropped. */
export function usePricedCart(menu: Menu) {
  const cart = useCart();
  const { priced, invalid, subtotal } = priceLines(cart.lines, menu);
  const stale = invalid.map((l) => l.key).join(" ");
  useEffect(() => {
    if (stale) cartActions.keepOnly((l) => !stale.split(" ").includes(l.key));
  }, [stale]);
  return { cart, lines: priced, subtotal, count: priced.reduce((n, p) => n + p.line.qty, 0) };
}

type PricedLines = ReturnType<typeof usePricedCart>["lines"];

/** The order's lines as the tracking reports them. */
export const trackItems = (lines: PricedLines) =>
  lines.map(({ item, line, unit }) => ({
    id: item.id,
    name: item.name.en,
    price: unit,
    quantity: line.qty,
  }));

type LinesProps = {
  lines: PricedLines;
  menu: Menu;
  lang: Locale;
  t: Dictionary["order"];
  /** Editable lines get a stepper plus Edit and Remove; read-only ones show "2 ×". */
  onEdit?: (line: CartLine) => void;
};

export function CartLines({ lines, menu, lang, t, onEdit }: LinesProps) {
  return (
    <ul className="flex flex-col gap-4">
      {lines.map(({ line, item, total }) => {
        const mods = describeSelections(item, menu, line.selections, lang);
        return (
          <li key={line.key} className="flex items-start gap-3">
            <ItemImage item={item} sizes="56px" className="size-14 flex-none rounded-[14px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-base leading-[1.25] font-bold">
                  {onEdit ? null : <span className="font-ui text-cacao">{line.qty} × </span>}
                  {item.name[lang]}
                </span>
                <span className="font-ui text-[15px] font-semibold whitespace-nowrap">
                  {formatPrice(total, lang)}
                </span>
              </div>
              {mods && (
                <span className="font-ui text-[13px] leading-[18px] text-cacao">{mods}</span>
              )}
              {line.note && (
                <span className="font-ui text-[13px] leading-[18px] text-cacao italic">
                  “{line.note}”
                </span>
              )}
              {onEdit && (
                <div className="mt-1.5 flex items-center gap-4">
                  <QtyStepper
                    value={line.qty}
                    min={0}
                    max={ordering.maxQuantity}
                    onChange={(qty) => {
                      if (qty === 0) track("remove_from_cart", { item_id: item.id });
                      cartActions.setQty(line.key, qty);
                    }}
                    labels={{ decrease: t.decrease, increase: t.increase, quantity: t.quantity }}
                  />
                  <button
                    type="button"
                    onClick={() => onEdit(line)}
                    className="min-h-9 font-ui text-[13px] font-semibold text-blueberry underline decoration-caramel decoration-2 underline-offset-4"
                  >
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      track("remove_from_cart", { item_id: item.id });
                      cartActions.remove(line.key);
                    }}
                    aria-label={fill(t.removeItem, { name: item.name[lang] })}
                    className="min-h-9 font-ui text-[13px] font-semibold text-cacao underline decoration-chocolate/25 decoration-2 underline-offset-4 hover:text-chocolate"
                  >
                    {t.remove}
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type TotalsProps = {
  totals: Totals;
  lang: Locale;
  t: Dictionary["order"];
};

export function CartTotals({ totals, lang, t }: TotalsProps) {
  return (
    <dl className="flex flex-col gap-2.5 border-t border-dashed border-chocolate/25 pt-4 font-ui text-[15px]">
      <div className="flex justify-between gap-3">
        <dt className="text-cacao">{t.subtotal}</dt>
        <dd>{formatPrice(totals.subtotal, lang)}</dd>
      </div>
      {totals.deliveryFee > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-cacao">{t.deliveryFee}</dt>
          <dd>{formatPrice(totals.deliveryFee, lang)}</dd>
        </div>
      )}
      {totals.discount > 0 && (
        <div className="flex justify-between gap-3 font-semibold text-blueberry">
          <dt>{t.discount}</dt>
          <dd>{formatPrice(-totals.discount, lang)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-3 pt-1 text-lg font-bold">
        <dt>{t.total}</dt>
        <dd>{formatPrice(totals.total, lang)}</dd>
      </div>
    </dl>
  );
}
