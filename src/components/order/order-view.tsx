"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Category, Menu, MenuItem } from "@/data/menu";
import type { Fulfilment, OrderingInfo } from "@/data/ordering";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill, plural, range } from "@/i18n/format";
import { routes } from "@/i18n/routes";
import { track } from "@/lib/tracking";
import { type CartLine, cartActions } from "@/lib/cart";
import { beirutTime, formatClock, type StoreStatus } from "@/lib/hours";
import { formatPrice } from "@/lib/money";
import { orderTotals } from "@/lib/pricing";
import { CartLines, CartTotals, trackItems, usePricedCart } from "./cart-summary";
import { CategoryTabs } from "./category-tabs";
import { ItemImage } from "./item-image";
import { openItem } from "./item-route";
import { ClockIcon, ItemSheet } from "./item-sheet";
import { useOrderingStatus } from "./use-store-status";

type Props = { lang: Locale; t: Dictionary["order"]; menu: Menu; branch: OrderingInfo };

/**
 * When online orders reopen: "today at 12 pm", "tomorrow at 12 pm", "on
 * Saturday at 12 pm". Empty while ordering is paused.
 */
export function opensLabel(status: StoreStatus, lang: Locale, t: Dictionary["order"]) {
  if (status.open || !status.reopens) return "";
  const { inDays, at } = status.reopens;
  const time = formatClock(at, lang);
  if (inDays === 0) return fill(t.opensToday, { time });
  if (inDays === 1) return fill(t.opensTomorrow, { time });
  return fill(t.opensOn, { day: t.weekdays[(beirutTime().day + inDays) % 7], time });
}

export const etaLabel = (mode: Fulfilment, t: Dictionary["order"], eta: OrderingInfo["eta"]) =>
  fill(mode === "delivery" ? t.etaDelivery : t.etaPickup, { range: range(eta[mode]) });

/** The note shown while online orders are closed or paused. */
export function ClosedNote({
  status,
  lang,
  t,
}: {
  status: StoreStatus;
  lang: Locale;
  t: Dictionary["order"];
}) {
  if (status.open) return null;
  return (
    <p className="font-ui text-[15px] leading-[1.45]">
      {status.reopens ? (
        <>
          <span className="font-bold">{t.closedTitle}</span>{" "}
          {fill(t.closedBody, { when: opensLabel(status, lang, t) })}
        </>
      ) : (
        <>
          <span className="font-bold">{t.pausedTitle}</span> {t.pausedBody}
        </>
      )}
    </p>
  );
}

export function OrderView({ lang, t, menu, branch }: Props) {
  const { cart, lines, subtotal, count } = usePricedCart(menu);
  const status = useOrderingStatus(branch.schedule);
  const closed = status?.open === false;
  const cartSheetRef = useRef<HTMLDialogElement>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  // No delivery fee yet: it's the area's, picked at checkout.
  const totals = orderTotals(subtotal, 0);
  const eta = etaLabel(cart.mode, t, branch.eta);

  const inCart = (item: MenuItem) =>
    cart.lines.reduce((n, l) => (l.itemId === item.id ? n + l.qty : n), 0);

  const openCartSheet = () => {
    if (!cartSheetRef.current?.open) cartSheetRef.current?.showModal();
    track("view_cart", { value: subtotal, items: trackItems(lines) });
  };

  // The header's cart button links to #your-order: on phones that opens the cart sheet.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== "#your-order") return;
      if (!matchMedia("(width >= 51.25rem)").matches) cartSheetRef.current?.showModal();
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const editLine = (line: CartLine) => {
    cartSheetRef.current?.close();
    openItem(line.itemId, line.key);
  };

  const checkout = (
    <CheckoutButton
      lang={lang}
      t={t}
      total={totals.total}
      disabledLabel={
        status && !status.open
          ? status.reopens
            ? fill(t.opensAt, { when: opensLabel(status, lang, t) })
            : t.pausedShort
          : null
      }
      onClick={() =>
        track("begin_checkout", {
          value: totals.total,
          food_value: subtotal,
          items: trackItems(lines),
        })
      }
    />
  );

  return (
    <div className="pb-28 desk:pb-0">
      <div className="shell flex flex-col gap-4 pt-[clamp(28px,3.4cqw,52px)] pb-[clamp(16px,2cqw,24px)]">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="title-section">{t.title}</h1>
            <p className="flex items-center gap-2 font-ui text-[15px] leading-5 text-cacao">
              <PinIcon />
              {t.branch} · {eta}
            </p>
          </div>
          <ModeToggle mode={cart.mode} t={t} />
        </div>

        {closed && status ? (
          <div className="flex items-start gap-3 rounded-[18px] border-[1.5px] border-chocolate/12 bg-whipped px-4 py-3.5">
            <span className="mt-0.5">
              <ClockIcon />
            </span>
            <ClosedNote status={status} lang={lang} t={t} />
          </div>
        ) : (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[18px] bg-strawberry-milk px-4 py-3 font-ui text-sm leading-5 font-medium">
            <span className="rounded-full bg-cherry px-2.5 py-1 text-xs leading-4 font-bold text-whipped">
              {t.dealTag}
            </span>
            {t.dealLine}
          </p>
        )}
      </div>

      <CategoryTabs categories={menu.categories} lang={lang} label={t.categoriesLabel} />

      <div className="shell grid items-start gap-[clamp(24px,3cqw,48px)] pt-[clamp(24px,2.6cqw,40px)] pb-section desk:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <div className="flex min-w-0 flex-col gap-[clamp(40px,4cqw,60px)]">
          {menu.categories.map((category, index) => (
            <MenuSection
              key={category.id}
              category={category}
              items={menu.items.filter((i) => i.category === category.id)}
              lang={lang}
              t={t}
              inCart={inCart}
              eager={index === 0}
            />
          ))}
        </div>

        <aside
          id="your-order"
          aria-labelledby="your-order-title"
          className="sticky top-[calc(var(--header-h,74px)+var(--sticky-extra,66px)+16px)] hidden max-h-[calc(100svh-var(--header-h,74px)-var(--sticky-extra,66px)-32px)] flex-col gap-5 rounded-[24px] border-[1.5px] border-chocolate/10 bg-whipped p-6 desk:flex"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="your-order-title"
              className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]"
            >
              {t.yourOrder}
            </h2>
            <span className="rounded-full bg-strawberry-milk px-3 py-1 font-ui text-[13px] font-semibold">
              {cart.mode === "delivery" ? t.delivery : t.pickup}
            </span>
          </div>
          {lines.length === 0 ? (
            <EmptyOrder t={t} />
          ) : (
            <>
              <div className="-me-2 min-h-0 flex-1 overflow-y-auto pe-2">
                <CartLines lines={lines} menu={menu} lang={lang} t={t} onEdit={editLine} />
              </div>
              <CartTotals totals={totals} lang={lang} t={t} />
              {checkout}
            </>
          )}
        </aside>
      </div>

      {/* Phones: a floating bar opens the order as a bottom sheet. */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-vanilla via-vanilla/90 to-vanilla/0 px-4 pt-6 pb-[max(14px,env(safe-area-inset-bottom))] desk:hidden">
          <button
            type="button"
            onClick={openCartSheet}
            aria-haspopup="dialog"
            className="btn btn-primary btn-lg w-full justify-between"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-vanilla px-2 text-sm text-blueberry">
                {count}
              </span>
              {t.viewOrder}
            </span>
            <span>{formatPrice(totals.total, lang)}</span>
          </button>
        </div>
      )}

      <dialog
        ref={cartSheetRef}
        aria-labelledby="cart-sheet-title"
        className="sheet desk:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) cartSheetRef.current?.close();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-chocolate/10 px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <h2
              id="cart-sheet-title"
              className="font-display text-2xl font-bold tracking-[-0.02em]"
            >
              {t.yourOrder}
            </h2>
            <span className="rounded-full bg-strawberry-milk px-3 py-1 font-ui text-[13px] font-semibold">
              {plural(lang, t.items, count)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => cartSheetRef.current?.close()}
            aria-label={t.close}
            className="btn btn-secondary btn-sm size-11 rounded-full p-0"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current stroke-[2.4] [stroke-linecap:round]"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {lines.length === 0 ? (
            <EmptyOrder t={t} />
          ) : (
            <CartLines lines={lines} menu={menu} lang={lang} t={t} onEdit={editLine} />
          )}
        </div>
        {lines.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-chocolate/10 px-5 pt-1 pb-[max(16px,env(safe-area-inset-bottom))]">
            <CartTotals totals={totals} lang={lang} t={t} />
            {checkout}
          </div>
        )}
      </dialog>

      <Suspense fallback={null}>
        <ItemSheet
          menu={menu}
          lang={lang}
          t={t}
          etaLabel={eta}
          onSaved={(text) => setToast({ id: Date.now(), text })}
        />
      </Suspense>

      <p
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 desk:bottom-8"
      >
        {toast && (
          <span
            key={toast.id}
            className="flex items-center gap-2 rounded-full bg-chocolate px-5 py-3 font-ui text-[15px] font-semibold text-vanilla shadow-[0_12px_28px_-12px_rgba(53,37,34,.6)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-[18px] fill-none stroke-strawberry-cream stroke-[2.8] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {toast.text}
          </span>
        )}
      </p>
    </div>
  );
}

function ModeToggle({ mode, t }: { mode: Fulfilment; t: Dictionary["order"] }) {
  return (
    <fieldset className="inline-flex gap-1 rounded-[16px] border-[1.5px] border-chocolate/12 bg-whipped p-1">
      <legend className="sr-only">{t.howLabel}</legend>
      {(["pickup", "delivery"] as const).map((value) => (
        <label
          key={value}
          className="relative flex min-h-11 cursor-pointer items-center rounded-[12px] px-5 font-ui text-[15px] font-semibold transition-colors duration-200 has-checked:bg-blueberry has-checked:text-vanilla has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-caramel"
        >
          <input
            type="radio"
            name="fulfilment"
            value={value}
            checked={mode === value}
            onChange={() => cartActions.setMode(value)}
            className="sr-only"
          />
          {value === "delivery" ? t.delivery : t.pickup}
        </label>
      ))}
    </fieldset>
  );
}

type SectionProps = {
  category: Category;
  items: MenuItem[];
  lang: Locale;
  t: Dictionary["order"];
  inCart: (item: MenuItem) => number;
  /** The first section is above the fold: load its first photos straight away. */
  eager?: boolean;
};

function MenuSection({ category, items, lang, t, inCart, eager = false }: SectionProps) {
  const groups = category.subcategories
    ? category.subcategories
        .map((sub) => ({ sub, items: items.filter((i) => i.subcategory === sub.id) }))
        .filter((g) => g.items.length > 0)
    : [{ sub: null, items }];

  return (
    <section id={category.id} aria-labelledby={`${category.id}-title`}>
      <div className="mb-4 flex flex-col gap-1">
        <h2
          id={`${category.id}-title`}
          className="font-display text-[clamp(26px,2.4cqw,34px)] leading-[1.12] font-bold tracking-[-0.02em]"
        >
          {category.name[lang]}
        </h2>
        <p className="font-body text-[15px] leading-normal text-cacao">
          {category.description[lang]}
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {groups.map(({ sub, items: groupItems }) => (
          <div key={sub?.id ?? "all"} className="flex flex-col gap-3">
            {sub && <h3 className="eyebrow text-blueberry">{sub.name[lang]}</h3>}
            <ul className="overflow-hidden rounded-[22px] bg-whipped desk:grid desk:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] desk:gap-[18px] desk:overflow-visible desk:rounded-none desk:bg-transparent">
              {groupItems.map((item, i) => (
                <li
                  key={item.id}
                  className="border-b border-chocolate/8 last:border-b-0 desk:border-0"
                >
                  <ItemCard
                    item={item}
                    count={inCart(item)}
                    lang={lang}
                    t={t}
                    eager={eager && i < 4}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

type CardProps = {
  item: MenuItem;
  count: number;
  lang: Locale;
  t: Dictionary["order"];
  eager: boolean;
};

function ItemCard({ item, count, lang, t, eager }: CardProps) {
  const soldOut = item.available === false;
  const tag = soldOut ? t.soldOut : item.tag ? t.tags[item.tag] : null;

  return (
    <button
      type="button"
      onClick={() => openItem(item.id)}
      aria-haspopup="dialog"
      aria-disabled={soldOut || undefined}
      aria-describedby={count > 0 ? `${item.id}-count` : undefined}
      className="group flex w-full items-stretch gap-3.5 p-4 text-start focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-caramel desk:h-full desk:flex-col desk:gap-0 desk:overflow-hidden desk:rounded-[22px] desk:border-[1.5px] desk:border-chocolate/10 desk:bg-whipped desk:p-0 desk:transition-[transform,box-shadow,border-color] desk:duration-300 desk:ease-soft desk:hover:-translate-y-1 desk:hover:border-chocolate desk:hover:shadow-[5px_6px_0_var(--color-chocolate)] desk:focus-visible:outline-offset-2"
    >
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1 desk:order-2 desk:gap-1.5 desk:px-[18px] desk:pt-4 desk:pb-[18px]">
        {tag && (
          <span
            className={`rounded-full px-2.5 py-1 font-ui text-[11px] leading-[14px] font-bold desk:hidden ${soldOut ? "bg-chocolate/10 text-cacao" : "bg-toffee text-chocolate"}`}
          >
            {tag}
          </span>
        )}
        <span className="font-display text-lg leading-[1.2] font-bold desk:text-[19px]">
          {item.name[lang]}
        </span>
        <span className="line-clamp-2 font-body text-sm leading-[1.45] text-cacao desk:text-[15px]">
          {item.description[lang]}
        </span>
        <span className="mt-auto flex w-full items-center justify-between gap-3 pt-2">
          <span className="font-ui text-[15px] font-bold">{formatPrice(item.price, lang)}</span>
          <span
            aria-hidden="true"
            className="hidden size-10 items-center justify-center rounded-full border-2 border-chocolate bg-blueberry text-vanilla shadow-[2px_2px_0_var(--color-chocolate)] transition-transform duration-200 group-hover:scale-105 desk:flex"
          >
            <PlusIcon />
          </span>
        </span>
      </span>

      <span className="relative size-[108px] flex-none desk:order-1 desk:aspect-[4/3] desk:size-auto desk:w-full">
        <ItemImage
          item={item}
          sizes="(min-width: 820px) 280px, 108px"
          eager={eager}
          className={`absolute inset-0 size-full rounded-2xl desk:rounded-none ${soldOut ? "grayscale" : ""}`}
        />
        {tag && (
          <span
            className={`absolute start-3 top-3 hidden rounded-full px-2.5 py-1 font-ui text-xs leading-4 font-bold desk:block ${soldOut ? "bg-chocolate text-vanilla" : "bg-toffee text-chocolate"}`}
          >
            {tag}
          </span>
        )}
        {count > 0 && (
          <span
            id={`${item.id}-count`}
            className="absolute end-3 top-3 hidden h-7 min-w-7 items-center justify-center rounded-full bg-blueberry px-2 font-ui text-[13px] font-bold text-vanilla desk:flex"
          >
            <span className="sr-only">{fill(t.inOrder, { count })}</span>
            <span aria-hidden="true">{count}</span>
          </span>
        )}
        {/* Phones: the add badge doubles as the count once it's in the order. */}
        <span
          aria-hidden="true"
          className="absolute -end-1.5 -bottom-1.5 flex size-9 items-center justify-center rounded-full border-[3px] border-whipped bg-blueberry font-ui text-[13px] font-bold text-vanilla desk:hidden"
        >
          {count > 0 ? count : <PlusIcon small />}
        </span>
      </span>
    </button>
  );
}

function EmptyOrder({ t }: { t: Dictionary["order"] }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] bg-strawberry-milk px-4 py-7 text-center">
      <span className="font-script text-[26px] leading-[1.35] text-blueberry">{t.treat}</span>
      <span className="font-body text-base leading-normal text-cacao">{t.empty}</span>
    </div>
  );
}

type CheckoutProps = {
  lang: Locale;
  t: Dictionary["order"];
  total: number;
  disabledLabel: string | null;
  onClick: () => void;
};

function CheckoutButton({ lang, t, total, disabledLabel, onClick }: CheckoutProps) {
  if (disabledLabel) {
    return (
      <span
        role="note"
        className="btn btn-lg w-full cursor-not-allowed border-chocolate/30 bg-strawberry-milk text-cacao shadow-none hover:transform-none hover:shadow-none"
      >
        {disabledLabel}
      </span>
    );
  }
  return (
    <Link href={routes(lang).checkout} onClick={onClick} className="btn btn-primary btn-lg w-full">
      {t.checkout} · {formatPrice(total, lang)} <span aria-hidden="true">{forwardArrow(lang)}</span>
    </Link>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 flex-none fill-none stroke-blueberry stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function PlusIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${small ? "size-4" : "size-5"} fill-none stroke-current stroke-[2.8] [stroke-linecap:round]`}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
