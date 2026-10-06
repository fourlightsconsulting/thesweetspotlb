"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { checkPromoAction, placeOrderAction } from "@/app/[lang]/checkout/actions";
import { CartLines, CartTotals, usePricedCart } from "@/components/order/cart-summary";
import { ClockIcon } from "@/components/order/item-sheet";
import { etaLabel, opensLabel } from "@/components/order/order-view";
import { useOrderingStatus } from "@/components/order/use-store-status";
import type { Menu } from "@/data/menu";
import { deliveryFeeFrom, deliveryFeeIsFlat, deliveryZones, ordering } from "@/data/ordering";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill, plural, range } from "@/i18n/format";
import { routes } from "@/i18n/routes";
import { track } from "@/lib/analytics";
import { cartActions } from "@/lib/cart";
import {
  type CheckoutFields,
  type FieldError,
  type PlacedOrder,
  type PromoError,
  validateFields,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/money";
import { saveOrder } from "@/lib/order-history";
import { orderTotals, type PromoRule } from "@/lib/pricing";

type Props = {
  lang: Locale;
  t: Dictionary["checkout"];
  order: Dictionary["order"];
  menu: Menu;
};

const SAVED_KEY = "tss.customer.v1";
const DRAFT_KEY = "tss.checkout.v1";
const ATTEMPT_KEY = "tss.checkout.attempt";
const EMPTY: CheckoutFields = {
  name: "",
  phone: "",
  zone: "",
  street: "",
  floor: "",
  driverNote: "",
};

type Banner = { tone: "error" | "info"; text: string };

const read = <T,>(storage: Storage, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (storage: Storage, key: string, value: unknown) => {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the form still works, it just won't be remembered.
  }
};

const subscribeNever = () => () => {};
// A string, so React sees the same snapshot until storage changes.
const readStored = () =>
  JSON.stringify({
    ...EMPTY,
    ...read<Partial<CheckoutFields>>(localStorage, SAVED_KEY),
    ...read<Partial<CheckoutFields>>(sessionStorage, DRAFT_KEY),
  });

/**
 * Details saved on this device (and any draft from this visit) live in the
 * browser only, so the prerendered form starts empty and remounts with them.
 */
export function CheckoutView(props: Props) {
  const stored = useSyncExternalStore(subscribeNever, readStored, () => null);
  return (
    <CheckoutForm
      key={stored === null ? "server" : "browser"}
      {...props}
      initialFields={stored === null ? EMPTY : (JSON.parse(stored) as CheckoutFields)}
    />
  );
}

/** One key per checkout attempt, kept for retries until the order goes through. */
function idempotencyKey() {
  try {
    const key = sessionStorage.getItem(ATTEMPT_KEY) ?? crypto.randomUUID();
    sessionStorage.setItem(ATTEMPT_KEY, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

function CheckoutForm({
  lang,
  t,
  order,
  menu,
  initialFields,
}: Props & { initialFields: CheckoutFields }) {
  const router = useRouter();
  const { cart, lines, subtotal, count } = usePricedCart(menu);
  const status = useOrderingStatus();
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
  const [placed, setPlaced] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const mode = cart.mode;
  const zone = deliveryZones.find((z) => z.id === fields.zone);
  const fee = mode === "delivery" ? (zone?.fee ?? deliveryFeeFrom) : 0;
  const totals = orderTotals(subtotal, fee, promo);
  const closed = status?.open === false;

  const update = (key: keyof CheckoutFields, value: string) => {
    setFields((prev) => {
      const next = { ...prev, [key]: value };
      write(sessionStorage, DRAFT_KEY, next);
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
    startPlacing(async () => {
      try {
        const result = await placeOrderAction({
          idempotencyKey: idempotencyKey(),
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
        });
        if (result.ok) {
          finish(result.order);
          return;
        }
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
              text: fill(t.serverErrors.closed, {
                when: opensLabel({ open: false, ...result }, lang, order),
              }),
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
        }
      } catch {
        showBanner({ tone: "error", text: t.serverErrors.network });
      }
    });
  };

  const finish = (placedOrder: PlacedOrder) => {
    setPlaced(true);
    saveOrder(placedOrder);
    // The driver note is for this order only.
    write(localStorage, SAVED_KEY, remember ? { ...fields, driverNote: "" } : null);
    write(sessionStorage, DRAFT_KEY, null);
    write(sessionStorage, ATTEMPT_KEY, null);
    track("purchase", {
      transaction_id: placedOrder.number,
      value: placedOrder.totals.total / 100,
    });
    cartActions.clear();
    router.replace(routes(lang).orderStatus(placedOrder.ref));
  };

  if (!placed && lines.length === 0) {
    return (
      <div className="shell flex flex-col items-start gap-4 pt-[clamp(28px,3.4cqw,52px)] pb-section">
        <BackLink lang={lang} label={t.back} />
        <h1 className="title-section">{t.emptyTitle}</h1>
        <p className="font-body text-lg text-cacao">{t.emptyBody}</p>
        <Link href={routes(lang).order} className="btn btn-primary btn-lg mt-2">
          {t.browse} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>
      </div>
    );
  }

  const feeLabel =
    mode === "delivery" && !zone && !deliveryFeeIsFlat
      ? `${formatPrice(deliveryFeeFrom, lang)}+`
      : undefined;
  const placeLabel = `${placing ? t.placing : t.place} · ${formatPrice(totals.total, lang)}`;
  const disabled = placing || placed || closed;
  const eta = etaLabel(mode, order);

  const summary = (
    <>
      <CartLines lines={lines} menu={menu} lang={lang} t={order} />
      <Link
        href={routes(lang).order}
        className="self-start font-ui text-[13px] font-semibold text-blueberry underline decoration-caramel decoration-2 underline-offset-4"
      >
        {order.edit}
      </Link>
      <CartTotals totals={totals} lang={lang} t={order} feeLabel={feeLabel} />
      <p className="flex items-center gap-2 font-ui text-sm text-cacao">
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
        <div className="rounded-[20px] border-[1.5px] border-chocolate/10 bg-whipped desk:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            aria-controls="mobile-summary"
            className="flex min-h-14 w-full items-center justify-between gap-3 px-[18px] font-ui text-[15px] font-semibold text-blueberry"
          >
            <span>
              {summaryOpen ? t.hideSummary : t.showSummary} · {plural(lang, order.items, count)}
            </span>
            <span className="text-[17px] font-bold text-chocolate">
              {formatPrice(totals.total, lang)}
            </span>
          </button>
          {summaryOpen && (
            <div
              id="mobile-summary"
              className="flex flex-col gap-4 border-t border-dashed border-chocolate/20 px-[18px] pt-4 pb-5"
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
              className={`flex items-start gap-3 rounded-[18px] border-[1.5px] px-4 py-3.5 font-ui text-[15px] leading-[1.45] font-medium ${banner.tone === "error" ? "border-raspberry bg-strawberry-milk" : "border-chocolate/12 bg-whipped"}`}
            >
              <Bang />
              {banner.text}
            </div>
          )}

          {closed && status && !banner && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-[18px] border-[1.5px] border-chocolate/12 bg-whipped px-4 py-3.5 font-ui text-[15px] leading-[1.45]"
            >
              <span className="mt-0.5">
                <ClockIcon />
              </span>
              <p>
                <span className="font-bold">{order.closedTitle}</span>{" "}
                {fill(order.closedBody, { when: opensLabel(status, lang, order) })}
              </p>
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
                description={fill(t.pickupDesc, { range: range(ordering.eta.pickup) })}
              />
              <ChoiceCard
                name="mode"
                checked={mode === "delivery"}
                onChange={() => cartActions.setMode("delivery")}
                title={order.delivery}
                description={fill(t.deliveryDesc, {
                  range: range(ordering.eta.delivery),
                  fee: deliveryFeeIsFlat
                    ? formatPrice(deliveryFeeFrom, lang)
                    : `${formatPrice(deliveryFeeFrom, lang)}+`,
                })}
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
                hint={t.phoneHint}
                error={
                  errors.phone &&
                  t.errors[errors.phone === "phoneInvalid" ? "phoneInvalid" : "phone"]
                }
              >
                <div
                  dir="ltr"
                  className={`flex h-[52px] items-stretch overflow-hidden rounded-[14px] border-[1.5px] bg-whipped focus-within:border-blueberry focus-within:ring-3 focus-within:ring-blueberry/15 ${errors.phone ? "border-2 border-caramel" : "border-chocolate/20"}`}
                >
                  <span className="flex items-center border-e-[1.5px] border-chocolate/12 px-3.5 font-ui text-base font-semibold text-cacao">
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
                    aria-describedby={`phone-hint${errors.phone ? " phone-error" : ""}`}
                    className="min-w-0 flex-1 bg-transparent px-3.5 font-ui text-base placeholder:text-cacao/55 focus:outline-none"
                  />
                </div>
              </Field>
            </div>

            {mode === "delivery" && (
              <div className="mt-6 flex flex-col gap-4 border-t border-dashed border-chocolate/20 pt-5">
                <h3 className="font-display text-lg leading-tight font-bold">{t.address}</h3>
                <fieldset
                  id="field-zone"
                  tabIndex={-1}
                  aria-invalid={Boolean(errors.zone)}
                  aria-describedby={errors.zone ? "zone-error" : undefined}
                  className="flex flex-col gap-2.5 focus:outline-none"
                >
                  <legend className="mb-2.5 font-ui text-sm font-semibold">{t.area}</legend>
                  <div className="flex flex-wrap gap-2">
                    {deliveryZones.map((z) => (
                      <label
                        key={z.id}
                        className={`relative flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] bg-whipped px-4 font-ui text-[15px] font-semibold transition-colors has-checked:border-blueberry has-checked:bg-blueberry has-checked:text-vanilla has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-caramel ${errors.zone ? "border-caramel" : "border-chocolate/15 hover:border-chocolate/40"}`}
                      >
                        <input
                          type="radio"
                          name="zone"
                          value={z.id}
                          checked={fields.zone === z.id}
                          onChange={() => update("zone", z.id)}
                          className="sr-only"
                        />
                        {z.name[lang]}
                        {!deliveryFeeIsFlat && (
                          <span className="opacity-75">· {formatPrice(z.fee, lang)}</span>
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.zone && <ErrorText id="zone-error" text={t.errors.area} />}
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
            <div className="flex items-start gap-3 rounded-[18px] border-2 border-chocolate bg-strawberry-milk p-4 shadow-[4px_5px_0_var(--color-chocolate)]">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-full border-2 border-blueberry bg-blueberry"
              >
                <span className="size-2 rounded-full bg-whipped" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-ui text-base font-bold">
                  {mode === "delivery" ? t.cod : t.pap}
                </span>
                <span className="font-ui text-sm text-cacao">
                  {mode === "delivery" ? t.codDesc : t.papDesc}
                </span>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <label htmlFor="promo" className="font-ui text-sm font-semibold">
                {t.promo}
              </label>
              {promo ? (
                <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-blueberry bg-whipped px-4">
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
                    className="min-h-11 font-ui text-[13px] font-semibold text-cacao underline decoration-chocolate/25 decoration-2 underline-offset-4"
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

          <p className="font-ui text-[13px] leading-[1.5] text-cacao">{t.privacy}</p>
        </div>

        <aside
          aria-label={t.summary}
          className="sticky top-[calc(var(--header-h,74px)+24px)] hidden flex-col gap-4 rounded-[24px] border-[1.5px] border-chocolate/10 bg-whipped p-6 desk:flex"
        >
          <h2 className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]">
            {t.summary}
          </h2>
          {summary}
          <PlaceButton label={placeLabel} disabled={disabled} placing={placing} />
        </aside>
      </div>

      {/* Phones: the button stays in reach at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-chocolate/10 bg-vanilla/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-md desk:hidden">
        <PlaceButton label={placeLabel} disabled={disabled} placing={placing} />
      </div>
    </form>
  );
}

const inputClass =
  "h-[52px] w-full rounded-[14px] border-[1.5px] border-chocolate/20 bg-whipped px-4 font-ui text-base placeholder:text-cacao/55 focus:border-blueberry focus:ring-3 focus:ring-blueberry/15 focus:outline-none aria-invalid:border-2 aria-invalid:border-caramel";

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border-[1.5px] border-chocolate/10 bg-whipped p-[clamp(18px,2.2cqw,30px)]">
      <h2 className="mb-5 flex items-center gap-3 font-display text-[clamp(21px,1.8cqw,24px)] leading-tight font-bold">
        <span
          aria-hidden="true"
          className="flex size-8 flex-none items-center justify-center rounded-full bg-blueberry font-ui text-sm font-bold text-vanilla"
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
        {optional && <span className="font-normal text-cacao"> ({optional})</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="font-ui text-[13px] text-cacao">
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
    <label className="relative flex cursor-pointer items-start gap-3 rounded-[18px] border-2 border-chocolate/15 bg-vanilla p-4 transition-[border-color,box-shadow,background-color] duration-200 has-checked:border-chocolate has-checked:bg-strawberry-milk has-checked:shadow-[4px_5px_0_var(--color-chocolate)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-caramel">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-full border-2 border-chocolate/45 peer-checked:border-blueberry peer-checked:bg-blueberry"
      >
        <span className={`size-2 rounded-full bg-whipped ${checked ? "" : "hidden"}`} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-ui text-base font-bold">{title}</span>
        <span className="font-ui text-sm leading-[1.4] text-cacao">{description}</span>
      </span>
    </label>
  );
}

function PlaceButton({
  label,
  disabled,
  placing,
}: {
  label: string;
  disabled: boolean;
  placing: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={placing || undefined}
      className="btn btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {placing && (
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-[2.5px] border-vanilla/40 border-t-vanilla"
        />
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
      className="mt-px flex size-5 flex-none items-center justify-center rounded-full bg-raspberry font-ui text-xs font-bold text-whipped"
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
