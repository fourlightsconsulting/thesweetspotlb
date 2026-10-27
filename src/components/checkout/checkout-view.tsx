"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { checkPromoAction, placeOrderAction } from "@/app/[lang]/checkout/actions";
import { SocialIcon } from "@/components/icons";
import { CartLines, CartTotals, trackItems, usePricedCart } from "@/components/order/cart-summary";
import { ClockIcon } from "@/components/order/item-sheet";
import { ClosedNote, etaLabel, opensLabel } from "@/components/order/order-view";
import { useOrderingStatus } from "@/components/order/use-store-status";
import type { Menu } from "@/data/menu";
import { type OrderingInfo, ordering } from "@/data/ordering";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill, plural, range } from "@/i18n/format";
import { routes } from "@/i18n/routes";
import { rememberCustomer, track, trackingIds } from "@/lib/tracking";
import { alphabetical } from "@/lib/alphabetical";
import { cartActions } from "@/lib/cart";
import {
  type CheckoutFields,
  type FieldError,
  type PlacedOrder,
  type PromoError,
  validateFields,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/money";
import {
  checkoutAttemptKey,
  completeCheckout,
  emptyCheckoutFields as EMPTY,
  readCheckoutFields,
  saveCheckoutDraft,
} from "@/lib/checkout-storage";
import { saveOrder } from "@/lib/order-history";
import { orderMessage, whatsappMessageUrl } from "@/lib/order-message";
import { orderTotals, type PromoRule } from "@/lib/pricing";
import { OrderPlaced } from "./order-confirmation";

type Props = {
  lang: Locale;
  t: Dictionary["checkout"];
  order: Dictionary["order"];
  confirmation: Dictionary["confirmation"];
  whatsapp: Dictionary["whatsappOrder"];
  menu: Menu;
  branch: OrderingInfo;
  /** The shop's WhatsApp (E.164), where each order is sent. */
  shopPhone: string | null;
};

type Banner = { tone: "error" | "info"; text: string };

const subscribeNever = () => () => {};

/**
 * Details saved on this device (and any draft from this visit) live in the
 * browser only, so the prerendered form starts empty and remounts with them.
 */
export function CheckoutView(props: Props) {
  const stored = useSyncExternalStore(subscribeNever, readCheckoutFields, () => null);
  return (
    <CheckoutForm
      key={stored === null ? "server" : "browser"}
      {...props}
      initialFields={stored === null ? EMPTY : (JSON.parse(stored) as CheckoutFields)}
    />
  );
}

/**
 * Opens the shop's chat with the order typed in. Phones hand wa.me links to
 * the WhatsApp app and keep this tab on the thanks card; computers get
 * WhatsApp Web in a tab of its own, or in this one if the browser blocks that.
 */
function openWhatsApp(url: string) {
  const computer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const tab = computer ? window.open(url, "_blank") : null;
  if (tab) tab.opener = null;
  else window.location.assign(url);
}

function CheckoutForm({
  lang,
  t,
  order,
  confirmation,
  whatsapp,
  menu,
  branch,
  shopPhone,
  initialFields,
}: Props & { initialFields: CheckoutFields }) {
  const { cart, lines, subtotal, count } = usePricedCart(menu);
  const status = useOrderingStatus(branch.schedule);
  const [fields, setFields] = useState<CheckoutFields>(initialFields);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFields, FieldError>>>({});
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoRule | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [placing, startPlacing] = useTransition();
  const [checkingPromo, startCheckingPromo] = useTransition();
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const mode = cart.mode;
  const areas = alphabetical(branch.areas, (area) => area.name[lang], lang);
  const area = areas.find((area) => area.id === fields.area);
  // The selected area's zone sets the delivery fee.
  const fee = mode === "delivery" ? (area?.fee ?? 0) : 0;
  const totals = orderTotals(subtotal, fee, promo);
  const closed = status?.open === false;

  const update = (key: keyof CheckoutFields, value: string) => {
    setFields((prev) => {
      const next = { ...prev, [key]: value };
      saveCheckoutDraft(next);
      return next;
    });
    if (errors[key]) {
      const next = { ...errors };
      delete next[key];
      setErrors(next);
      // Every flagged field fixed: the "check the highlighted fields" note can go.
      if (Object.keys(next).length === 0 && banner?.text === t.errors.summary) setBanner(null);
    }
  };

  const showBanner = (next: Banner) => {
    setBanner(next);
    requestAnimationFrame(() =>
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const promoMessage = (error: PromoError, shortBy?: number) =>
    error === "minimum"
      ? fill(t.promoErrors.minimum, { amount: formatPrice(shortBy ?? 0, lang) })
      : t.promoErrors[error];

  const applyPromo = () => {
    const code = promoInput.trim();
    if (!code) return;
    startCheckingPromo(async () => {
      try {
        const result = await checkPromoAction(code, subtotal);
        if (result.ok) {
          setPromo(result.rule);
          setPromoError(null);
          track("add_promo_code", { code: result.rule.code });
        } else {
          setPromo(null);
          setPromoError(promoMessage(result.error, result.shortBy));
          track("promo_rejected", { code: code.toUpperCase().slice(0, 24), reason: result.error });
        }
      } catch {
        setPromoError(t.serverErrors.network);
      }
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (placing || lines.length === 0) return;
    const fieldErrors = validateFields(mode, fields);
    setErrors(fieldErrors);
    const firstInvalid = (Object.keys(fieldErrors) as (keyof CheckoutFields)[])[0];
    if (firstInvalid) {
      setBanner({ tone: "error", text: t.errors.summary });
      const el = document.getElementById(`field-${firstInvalid}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setBanner(null);
    rememberCustomer({ phone: fields.phone, name: fields.name });
    startPlacing(async () => {
      try {
        const result = await placeOrderAction({
          idempotencyKey: checkoutAttemptKey(),
          lang,
          mode,
          fields,
          promoCode: promo?.code ?? null,
          lines: lines.map(({ line }) => ({
            itemId: line.itemId,
            qty: line.qty,
            selections: line.selections,
            note: line.note,
          })),
          quotedTotal: totals.total,
          tracking: trackingIds(),
        });
        if (result.ok) {
          finish(result.order);
          return;
        }
        track("place_order_failed", { reason: result.code });
        switch (result.code) {
          case "invalid":
            setErrors(result.fields);
            showBanner({
              tone: "error",
              text: Object.keys(result.fields).length ? t.errors.summary : t.serverErrors.invalid,
            });
            break;
          case "closed":
            showBanner({
              tone: "info",
              text: result.reopens
                ? fill(t.serverErrors.closed, {
                    when: opensLabel({ open: false, reopens: result.reopens }, lang, order),
                  })
                : t.serverErrors.paused,
            });
            break;
          case "items":
            showBanner({ tone: "error", text: t.serverErrors.items });
            break;
          case "promo":
            setPromo(null);
            setPromoError(promoMessage(result.error));
            showBanner({ tone: "error", text: promoMessage(result.error) });
            break;
          case "unavailable":
            showBanner({ tone: "info", text: t.serverErrors.unavailable });
            break;
          case "failed":
            showBanner({ tone: "error", text: t.serverErrors.generic });
            break;
        }
      } catch {
        track("place_order_failed", { reason: "network" });
        showBanner({ tone: "error", text: t.serverErrors.network });
      }
    });
  };

  const finish = (placedOrder: PlacedOrder) => {
    saveOrder(placedOrder);
    // The driver note is for this order only.
    completeCheckout(fields, remember);
    track("purchase", {
      order_ref: placedOrder.ref,
      value: placedOrder.totals.total,
      food_value: placedOrder.totals.subtotal - placedOrder.totals.discount,
      shipping: placedOrder.totals.deliveryFee,
      items: trackItems(lines),
      ...(placedOrder.promoCode ? { coupon: placedOrder.promoCode } : {}),
    });
    cartActions.clear();
    // The thanks card takes the form's place, at the order's own address so
    // Back and reload find it; then WhatsApp opens with the order.
    window.history.replaceState(null, "", routes(lang).orderStatus(placedOrder.ref));
    setPlaced(placedOrder);
    window.scrollTo({ top: 0 });
    if (shopPhone)
      openWhatsApp(whatsappMessageUrl(shopPhone, orderMessage(placedOrder, lang, whatsapp, order)));
  };

  if (placed) return <OrderPlaced lang={lang} t={confirmation} order={placed} />;

  if (lines.length === 0) {
    return (
      <div className="shell flex flex-col items-start gap-4 pt-[clamp(28px,3.4cqw,52px)] pb-section">
        <BackLink lang={lang} label={t.back} />
        <h1 className="title-section">{t.emptyTitle}</h1>
        <p className="font-body text-lg text-ink-soft">{t.emptyBody}</p>
        <Link href={routes(lang).order} className="btn btn-primary btn-lg mt-2">
          {t.browse} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>
      </div>
    );
  }

  const placeLabel = `${placing ? t.placing : t.place} · ${formatPrice(totals.total, lang)}`;
  const disabled = placing || closed;
  const eta = etaLabel(mode, order, branch.eta);

  const summary = (
    <>
      <CartLines lines={lines} menu={menu} lang={lang} t={order} />
      <Link
        href={routes(lang).order}
        className="self-start font-ui text-[13px] font-semibold text-blueberry underline decoration-raspberry decoration-2 underline-offset-4"
      >
        {order.edit}
      </Link>
      <CartTotals totals={totals} lang={lang} t={order} />
      <p className="flex items-center gap-2 font-ui text-sm text-ink-soft">
        <ClockIcon />
        {eta}
      </p>
    </>
  );

  return (
    <form onSubmit={submit} noValidate className="pb-32 desk:pb-0">
      <div className="shell pt-[clamp(20px,3cqw,40px)]">
        <BackLink lang={lang} label={t.back} />
        <h1 className="mt-2 mb-[clamp(20px,2.4cqw,32px)] title-section">{t.title}</h1>
      </div>

      <div className="shell grid items-start gap-[clamp(20px,2.6cqw,40px)] pb-section desk:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        {/* Phones: the summary folds away above the form. */}
        <div className="overflow-hidden rounded-[22px] border-2 border-ink bg-pink-tint desk:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            aria-controls="mobile-summary"
            className="flex min-h-14 w-full items-center justify-between gap-3 px-[18px] font-ui text-[15px] font-semibold text-blueberry focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-raspberry"
          >
            <span>
              {summaryOpen ? t.hideSummary : t.showSummary} · {plural(lang, order.items, count)}
            </span>
            <span className="text-[17px] font-bold text-ink">
              {formatPrice(totals.total, lang)}
            </span>
          </button>
          {summaryOpen && (
            <div
              id="mobile-summary"
              className="flex flex-col gap-4 border-t border-dashed border-ink/25 px-[18px] pt-4 pb-5"
            >
              {summary}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(16px,1.8cqw,24px)]">
          {banner && (
            <div
              ref={bannerRef}
              role={banner.tone === "error" ? "alert" : "status"}
              className={`flex items-start gap-3 rounded-[18px] border-[1.5px] px-4 py-3.5 font-ui text-[15px] leading-[1.45] font-medium ${banner.tone === "error" ? "border-raspberry bg-pink-tint" : "border-ink/15 bg-whipped"}`}
            >
              <Bang />
              {banner.text}
            </div>
          )}

          {closed && status && !banner && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-[18px] border-[1.5px] border-ink/15 bg-whipped px-4 py-3.5 font-ui text-[15px] leading-[1.45]"
            >
              <span className="mt-0.5">
                <ClockIcon />
              </span>
              <ClosedNote status={status} lang={lang} t={order} />
            </div>
          )}

          <Step number={1} title={t.stepHow}>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">{t.stepHow}</legend>
              <ChoiceCard
                name="mode"
                checked={mode === "pickup"}
                onChange={() => cartActions.setMode("pickup")}
                title={order.pickup}
                description={fill(t.pickupDesc, { range: range(branch.eta.pickup) })}
              />
              <ChoiceCard
                name="mode"
                checked={mode === "delivery"}
                onChange={() => cartActions.setMode("delivery")}
                title={order.delivery}
                description={fill(t.deliveryDesc, { range: range(branch.eta.delivery) })}
              />
            </fieldset>
          </Step>

          <Step number={2} title={t.stepDetails}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label={t.name} error={errors.name && t.errors.name}>
                <input
                  id="field-name"
                  value={fields.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoComplete="name"
                  maxLength={60}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className={inputClass}
                />
              </Field>
              <Field
                id="phone"
                label={t.phone}
                error={
                  errors.phone &&
                  t.errors[errors.phone === "phoneInvalid" ? "phoneInvalid" : "phone"]
                }
              >
                <div
                  dir="ltr"
                  className={`flex h-[52px] items-stretch overflow-hidden rounded-[14px] border-[1.5px] bg-paper focus-within:border-ink focus-within:ring-3 focus-within:ring-raspberry/25 ${errors.phone ? "border-2 border-raspberry" : "border-ink/25"}`}
                >
                  <span className="flex items-center border-e-[1.5px] border-ink/15 px-3.5 font-ui text-base font-semibold text-ink-soft">
                    +961
                  </span>
                  <input
                    id="field-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="71 234 567"
                    value={fields.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    maxLength={24}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className="min-w-0 flex-1 bg-transparent px-3.5 font-ui text-base placeholder:text-ink-soft/55 focus:outline-none"
                  />
                </div>
              </Field>
            </div>

            {mode === "delivery" && (
              <div className="mt-6 flex flex-col gap-4 border-t border-dashed border-ink/20 pt-5">
                <h3 className="font-display text-lg leading-tight font-bold">{t.address}</h3>
                <fieldset
                  id="field-area"
                  tabIndex={-1}
                  aria-invalid={Boolean(errors.area)}
                  aria-describedby={errors.area ? "area-error" : undefined}
                  className="flex flex-col gap-2.5 focus:outline-none"
                >
                  <legend className="mb-2.5 font-ui text-sm font-semibold">{t.area}</legend>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((z) => (
                      <label
                        key={z.id}
                        className={`relative flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] bg-paper px-4 font-ui text-[15px] font-semibold transition-colors has-checked:border-ink has-checked:bg-blueberry has-checked:text-paper has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-raspberry ${errors.area ? "border-raspberry" : "border-ink/20 hover:border-ink/50"}`}
                      >
                        <input
                          type="radio"
                          name="area"
                          value={z.id}
                          checked={fields.area === z.id}
                          onChange={() => update("area", z.id)}
                          className="sr-only"
                        />
                        {z.name[lang]}
                      </label>
                    ))}
                  </div>
                  {errors.area && <ErrorText id="area-error" text={t.errors.area} />}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="street" label={t.street} error={errors.street && t.errors.street}>
                    <input
                      id="field-street"
                      value={fields.street}
                      onChange={(e) => update("street", e.target.value)}
                      autoComplete="address-line1"
                      maxLength={160}
                      aria-invalid={Boolean(errors.street)}
                      aria-describedby={errors.street ? "street-error" : undefined}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="floor" label={t.floor} optional={t.optional}>
                    <input
                      id="field-floor"
                      value={fields.floor}
                      onChange={(e) => update("floor", e.target.value)}
                      autoComplete="address-line2"
                      maxLength={80}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field id="driverNote" label={t.driverNote} optional={t.optional}>
                  <input
                    id="field-driverNote"
                    value={fields.driverNote}
                    onChange={(e) => update("driverNote", e.target.value)}
                    maxLength={ordering.noteMaxLength}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-center gap-3 font-ui text-[15px]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-5 flex-none cursor-pointer accent-blueberry"
              />
              {t.remember}
            </label>
          </Step>

          <Step number={3} title={t.stepPayment}>
            <div className="flex items-start gap-3 rounded-[18px] border-2 border-ink bg-cotton-candy p-4 shadow-[3px_4px_0_var(--color-ink)]">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-full border-2 border-ink bg-blueberry"
              >
                <span className="size-2 rounded-full bg-whipped" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-ui text-base font-bold">
                  {mode === "delivery" ? t.cod : t.pap}
                </span>
                <span className="font-ui text-sm text-ink-soft">
                  {mode === "delivery" ? t.codDesc : t.papDesc}
                </span>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <label htmlFor="promo" className="font-ui text-sm font-semibold">
                {t.promo}
              </label>
              {promo ? (
                <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-ink/40 bg-pink-tint px-4">
                  <span className="flex items-center gap-2 font-ui text-[15px] font-semibold text-blueberry">
                    <Check />
                    {fill(t.promoApplied, { code: promo.code })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPromo(null);
                      setPromoInput("");
                    }}
                    className="min-h-11 font-ui text-[13px] font-semibold text-ink-soft underline decoration-raspberry decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-raspberry"
                  >
                    {t.removePromo}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <input
                    id="promo"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyPromo();
                      }
                    }}
                    placeholder="SWEET20"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={24}
                    aria-invalid={Boolean(promoError)}
                    aria-describedby={promoError ? "promo-error" : undefined}
                    className={`${inputClass} min-w-0 flex-1 uppercase`}
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={checkingPromo || !promoInput.trim()}
                    className="btn btn-secondary min-h-[52px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.apply}
                  </button>
                </div>
              )}
              {promoError && <ErrorText id="promo-error" text={promoError} />}
            </div>
          </Step>
        </div>

        <aside
          aria-label={t.summary}
          className="sticky top-[calc(var(--header-h,74px)+24px)] hidden flex-col gap-4 rounded-[24px] border-2 border-ink bg-pink-tint p-6 shadow-[4px_5px_0_var(--color-ink)] desk:flex"
        >
          <h2 className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-blueberry">
            {t.summary}
          </h2>
          {summary}
          <PlaceButton
            label={placeLabel}
            disabled={disabled}
            placing={placing}
            whatsapp={Boolean(shopPhone)}
          />
        </aside>
      </div>

      {/* Phones: the button stays in reach at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/15 bg-paper/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-md desk:hidden">
        <PlaceButton
          label={placeLabel}
          disabled={disabled}
          placing={placing}
          whatsapp={Boolean(shopPhone)}
        />
      </div>
    </form>
  );
}

const inputClass =
  "h-[52px] w-full rounded-[14px] border-[1.5px] border-ink/25 bg-paper px-4 font-ui text-base placeholder:text-ink-soft/55 focus:border-ink focus:ring-3 focus:ring-raspberry/25 focus:outline-none aria-invalid:border-2 aria-invalid:border-raspberry";

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border-[1.5px] border-ink/15 bg-whipped p-[clamp(18px,2.2cqw,30px)]">
      <h2 className="mb-5 flex items-center gap-3 font-display text-[clamp(21px,1.8cqw,24px)] leading-tight font-bold text-blueberry">
        <span
          aria-hidden="true"
          className="flex size-8 flex-none items-center justify-center rounded-full border-2 border-ink bg-cotton-candy font-ui text-sm font-bold text-ink"
        >
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  optional?: string;
  error?: string | false;
  children: ReactNode;
};

function Field({ id, label, hint, optional, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`field-${id}`} className="font-ui text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-ink-soft"> ({optional})</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="font-ui text-[13px] text-ink-soft">
          {hint}
        </p>
      )}
      {error && <ErrorText id={`${id}-error`} text={error} />}
    </div>
  );
}

function ErrorText({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="flex items-center gap-2 font-ui text-sm font-semibold">
      <Bang />
      {text}
    </p>
  );
}

type ChoiceProps = {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
};

function ChoiceCard({ name, checked, onChange, title, description }: ChoiceProps) {
  return (
    <label className="relative flex cursor-pointer items-start gap-3 rounded-[18px] border-2 border-ink/20 bg-paper p-4 transition-[border-color,box-shadow,background-color] duration-200 has-checked:border-ink has-checked:bg-strawberry-cream has-checked:shadow-[3px_4px_0_var(--color-ink)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-raspberry">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-full border-2 border-ink/40 peer-checked:border-ink peer-checked:bg-blueberry"
      >
        <span className={`size-2 rounded-full bg-whipped ${checked ? "" : "hidden"}`} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-ui text-base font-bold">{title}</span>
        <span className="font-ui text-sm leading-[1.4] text-ink-soft">{description}</span>
      </span>
    </label>
  );
}

/** Placing the order also opens WhatsApp to send it, hence its icon. */
function PlaceButton({
  label,
  disabled,
  placing,
  whatsapp,
}: {
  label: string;
  disabled: boolean;
  placing: boolean;
  whatsapp: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={placing || undefined}
      className="btn btn-primary btn-lg w-full gap-2.5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {placing ? (
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-[2.5px] border-paper/40 border-t-paper"
        />
      ) : (
        whatsapp && <SocialIcon network="whatsapp" className="size-6 [--icon-stroke:2px]" />
      )}
      {label}
    </button>
  );
}

function BackLink({ lang, label }: { lang: Locale; label: string }) {
  return (
    <Link
      href={routes(lang).order}
      className="inline-flex min-h-11 items-center gap-2 font-ui text-[15px] font-semibold text-blueberry"
    >
      <span aria-hidden="true">{lang === "ar" ? "→" : "←"}</span>
      {label}
    </Link>
  );
}

function Bang() {
  return (
    <span
      aria-hidden="true"
      className="mt-px flex size-5 flex-none items-center justify-center rounded-full bg-raspberry font-ui text-xs font-bold text-ink"
    >
      !
    </span>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px] fill-none stroke-current stroke-[2.8] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
