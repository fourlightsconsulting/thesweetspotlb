"use client";

import Link from "next/link";
import { Heart } from "@/components/doodles";
import { CartTotals } from "@/components/order/cart-summary";
import { ClockIcon } from "@/components/order/item-sheet";
import { site } from "@/data/site";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill } from "@/i18n/format";
import { routes } from "@/i18n/routes";
import { clockAfter } from "@/lib/hours";
import { formatPrice } from "@/lib/money";
import { usePlacedOrder } from "@/lib/order-history";
import { formatPhoneLocal } from "@/lib/phone";

type Props = {
  lang: Locale;
  orderRef: string;
  t: Dictionary["confirmation"];
  order: Dictionary["order"];
};

export function OrderConfirmation({ lang, orderRef, t, order: o }: Props) {
  const placed = usePlacedOrder(orderRef);

  if (placed === undefined) return <div className="min-h-[60svh]" />;

  if (placed === null) {
    return (
      <div className="shell flex flex-col items-start gap-4 pt-section-sm pb-section">
        <h1 className="title-section">{t.notFoundTitle}</h1>
        <p className="font-body text-lg text-cacao">{t.notFoundBody}</p>
        <Link href={routes(lang).order} className="btn btn-primary btn-lg mt-2">
          {t.again} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>
      </div>
    );
  }

  const delivery = placed.mode === "delivery";
  const eta = clockAfter(new Date(placed.placedAt), placed.eta[1], lang);
  const steps = [t.received, t.preparing, delivery ? t.onTheWay : t.readyPickup];

  return (
    <div className="shell flex justify-center pt-section-sm pb-section">
      <div className="flex w-full max-w-[680px] flex-col gap-[clamp(18px,2cqw,26px)]">
        <section className="relative rounded-[28px] border-[2.5px] border-chocolate bg-strawberry-cream p-[clamp(24px,4cqw,40px)] shadow-[6px_7px_0_var(--color-chocolate)]">
          <span
            aria-hidden="true"
            className="mb-4 flex size-14 items-center justify-center rounded-full border-[2.5px] border-chocolate bg-blueberry text-vanilla shadow-[3px_3px_0_var(--color-chocolate)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-7 fill-none stroke-current stroke-[2.8] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <p className="eyebrow text-blueberry">
            {t.orderNo} <bdi dir="ltr">{placed.number}</bdi>
          </p>
          <h1 className="mt-2 title-section">
            {delivery ? t.titleDelivery : t.titlePickup}
            <Heart className="ms-[0.14em] inline-block size-[0.48em] rotate-12 align-[0.06em]" />
          </h1>
          <p className="mt-4 flex items-center gap-2 font-ui text-lg font-semibold">
            <ClockIcon />
            {fill(delivery ? t.etaDelivery : t.etaPickup, { time: eta })}
          </p>
          {placed.demo && (
            <p className="mt-4 rounded-[14px] bg-whipped/75 px-4 py-2.5 font-ui text-sm text-cacao">
              {t.demo}
            </p>
          )}
        </section>

        <ol aria-label={t.progress} className="grid grid-cols-3 gap-2">
          {steps.map((step, i) => (
            <li key={step} className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className={`h-2 rounded-full ${i === 0 ? "bg-blueberry" : "bg-chocolate/12"}`}
              />
              <span
                aria-current={i === 0 ? "step" : undefined}
                className={`font-ui text-sm leading-[1.3] ${i === 0 ? "font-bold text-blueberry" : "text-cacao"}`}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>

        <section className="flex flex-col gap-5 rounded-[24px] border-[1.5px] border-chocolate/10 bg-whipped p-[clamp(18px,2.4cqw,28px)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 font-ui text-[15px] leading-[1.45]">
              <span className="text-[13px] font-semibold text-cacao">
                {delivery ? t.deliverTo : t.pickupFrom}
              </span>
              {placed.address ? (
                <>
                  <span className="font-semibold">{placed.address.zone[lang]}</span>
                  <span>{placed.address.street}</span>
                  {placed.address.floor && <span>{placed.address.floor}</span>}
                </>
              ) : (
                <>
                  <span className="font-semibold">{t.pickupPlace}</span>
                  <a
                    href={site.tripoliDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="self-start font-semibold text-blueberry underline decoration-caramel decoration-2 underline-offset-4"
                  >
                    {t.directions}
                  </a>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1 font-ui text-[15px] leading-[1.45]">
              <span className="font-semibold">{placed.name}</span>
              <bdi dir="ltr" className="text-cacao">
                +961 {formatPhoneLocal(placed.phone)}
              </bdi>
              <span className="mt-1 text-cacao">{delivery ? t.payCod : t.payPap}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-dashed border-chocolate/20 pt-5">
            <h2 className="font-display text-xl font-bold">{t.yourOrder}</h2>
            <ul className="flex flex-col gap-3">
              {placed.lines.map((line, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 font-ui text-[15px]"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      <span className="text-cacao">{line.qty} × </span>
                      {line.name[lang]}
                    </span>
                    {line.options[lang] && (
                      <span className="text-[13px] text-cacao">{line.options[lang]}</span>
                    )}
                    {line.note && (
                      <span className="text-[13px] text-cacao italic">“{line.note}”</span>
                    )}
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    {formatPrice(line.total, lang)}
                  </span>
                </li>
              ))}
            </ul>
            <CartTotals totals={placed.totals} lang={lang} t={o} />
          </div>
        </section>

        <Link href={routes(lang).order} className="btn btn-primary btn-lg self-start">
          {t.again} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>
      </div>
    </div>
  );
}
