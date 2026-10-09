"use client";

import Link from "next/link";
import { Heart } from "@/components/doodles";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";
import type { PlacedOrder } from "@/lib/checkout";
import { usePlacedOrder } from "@/lib/order-history";

type Props = { lang: Locale; t: Dictionary["confirmation"] };

/**
 * The thanks card, left in the tab once the order is placed and WhatsApp
 * opens to send it. No status or arrival time: the shop doesn't report one
 * yet.
 */
export function OrderPlaced({ lang, t, order }: Props & { order: PlacedOrder }) {
  return (
    <div className="shell flex justify-center pt-section-sm pb-section">
      <div className="flex w-full max-w-[680px] flex-col items-start gap-[clamp(18px,2cqw,26px)]">
        <section className="relative w-full rounded-[28px] border-[2.5px] border-chocolate bg-strawberry-cream p-[clamp(24px,4cqw,40px)] shadow-[6px_7px_0_var(--color-chocolate)]">
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
            {t.orderNo} <bdi dir="ltr">{order.number}</bdi>
          </p>
          <h1 className="mt-2 title-section">
            {order.mode === "delivery" ? t.titleDelivery : t.titlePickup}
            <Heart className="ms-[0.14em] inline-block size-[0.48em] rotate-12 align-[0.06em]" />
          </h1>
          {order.demo && (
            <p className="mt-4 rounded-[14px] bg-whipped/75 px-4 py-2.5 font-ui text-sm text-cacao">
              {t.demo}
            </p>
          )}
        </section>

        <Link href={routes(lang).order} className="btn btn-primary btn-lg">
          {t.again} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>
      </div>
    </div>
  );
}

/** The thanks page on reload or Back: the order as this device saved it. */
export function OrderConfirmation({ lang, orderRef, t }: Props & { orderRef: string }) {
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

  return <OrderPlaced lang={lang} t={t} order={placed} />;
}
