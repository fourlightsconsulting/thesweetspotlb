"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { BundleSlot, Menu, MenuItem, OptionGroup } from "@/data/menu";
import { ordering } from "@/data/ordering";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill } from "@/i18n/format";
import { track } from "@/lib/analytics";
import { type CartLine, cartActions, useCart } from "@/lib/cart";
import { formatAddOn, formatPrice } from "@/lib/money";
import {
  bundlePicks,
  checkSelections,
  defaultSelections,
  isSingleChoice,
  pickDefaults,
  type Selections,
  slotKey,
  unitPrice,
} from "@/lib/pricing";
import { ItemImage } from "./item-image";
import { closeItem } from "./item-route";
import { QtyStepper } from "./qty-stepper";

type Props = {
  menu: Menu;
  lang: Locale;
  t: Dictionary["order"];
  etaLabel: string;
  onSaved: (message: string) => void;
};

/**
 * The customiser, driven by the URL: ?item=<id> opens it, &line=<key> edits a
 * line already in the order, and any other ?<group>=<option> preselects.
 */
export function ItemSheet({ menu, lang, t, etaLabel, onSaved }: Props) {
  const params = useSearchParams();
  const cart = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const item = menu.items.find((i) => i.id === params.get("item"));
  const lineKey = params.get("line");
  const line = lineKey
    ? cart.lines.find((l) => l.key === lineKey && l.itemId === item?.id)
    : undefined;

  // Keep showing the last item while the sheet animates closed.
  const [shown, setShown] = useState<{ item: MenuItem; lineKey: string | null; line?: CartLine }>();
  if (item && (shown?.item !== item || shown.lineKey !== lineKey))
    setShown({ item, lineKey, line });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) {
      dialog.showModal();
      track("view_item", { item_id: item.id });
    } else if (!item && dialog.open) dialog.close();
  }, [item]);

  const presets: Selections = {};
  if (item && !line) {
    for (const groupId of item.groups) {
      const value = params.get(groupId);
      if (value) presets[groupId] = [value];
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="item-title"
      className="sheet"
      onClose={() => {
        if (new URLSearchParams(window.location.search).has("item")) closeItem();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close(); // click on the backdrop
      }}
    >
      {shown && (
        <ItemForm
          key={`${shown.item.id}:${shown.line?.key ?? ""}`}
          item={shown.item}
          line={shown.line}
          presets={presets}
          menu={menu}
          lang={lang}
          t={t}
          etaLabel={etaLabel}
          onClose={() => dialogRef.current?.close()}
          onSaved={(message) => {
            dialogRef.current?.close();
            onSaved(message);
          }}
        />
      )}
    </dialog>
  );
}

type FormProps = {
  item: MenuItem;
  line?: CartLine;
  presets: Selections;
  menu: Menu;
  lang: Locale;
  t: Dictionary["order"];
  etaLabel: string;
  onClose: () => void;
  onSaved: (message: string) => void;
};

function ItemForm({ item, line, presets, menu, lang, t, etaLabel, onClose, onSaved }: FormProps) {
  const groups = item.groups.map((id) => menu.groups[id]).filter(Boolean);
  const [selections, setSelections] = useState<Selections>(() =>
    line ? structuredClone(line.selections) : { ...defaultSelections(item, menu), ...presets },
  );
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [note, setNote] = useState(line?.note ?? "");
  const [triedSubmit, setTriedSubmit] = useState(false);

  const check = checkSelections(item, menu, selections);
  const total = unitPrice(item, menu, selections) * qty;
  const soldOut = item.available === false;

  /** `key`: the group's selections key ("slot/group" for a bundle pick's own group). */
  const toggle = (key: string, group: OptionGroup, optionId: string) => {
    setSelections((prev) => {
      const chosen = prev[key] ?? [];
      if (isSingleChoice(group)) {
        // A required single choice can only switch; an optional one can also be cleared.
        const clear = group.min === 0 && chosen[0] === optionId;
        return { ...prev, [key]: clear ? [] : [optionId] };
      }
      if (chosen.includes(optionId)) {
        return { ...prev, [key]: chosen.filter((id) => id !== optionId) };
      }
      return chosen.length >= group.max ? prev : { ...prev, [key]: [...chosen, optionId] };
    });
  };

  /** Picks an item in a bundle slot: its own choices start over from its defaults. */
  const pick = (slot: BundleSlot, itemId: string) => {
    const picked = menu.items.find((i) => i.id === itemId);
    if (!picked) return;
    setSelections((prev) => {
      const next: Selections = {};
      for (const [key, value] of Object.entries(prev))
        if (!key.startsWith(`${slot.id}/`)) next[key] = value;
      return { ...next, [slot.id]: [itemId], ...pickDefaults(picked, menu, slot.id) };
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (soldOut) return;
    if (!check.ok) {
      setTriedSubmit(true);
      const first = document.getElementById(`group-${check.missing[0]}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      first?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      return;
    }
    const saved = { itemId: item.id, qty, selections, note: note.trim() };
    if (line) cartActions.update(line.key, saved);
    else cartActions.add(saved);
    track("add_to_cart", { item_id: item.id, quantity: qty, value: total / 100 });
    onSaved(line ? t.updated : t.added);
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none">
        <div className="relative aspect-[16/11] w-full bg-cotton-candy">
          <ItemImage
            item={item}
            sizes="(min-width: 820px) 500px, 100vw"
            eager
            className="absolute inset-0 size-full"
          />
          <span
            aria-hidden="true"
            className="absolute top-2 left-1/2 h-1.5 w-11 -translate-x-1/2 rounded-full bg-vanilla/85 desk:hidden"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            autoFocus
            className="btn btn-secondary btn-sm absolute end-4 top-4 size-11 rounded-full p-0"
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

        <div className="flex flex-col gap-2 px-6 pt-5 pb-5">
          <h2
            id="item-title"
            className="font-display text-[28px] leading-[1.08] font-black tracking-[-0.02em] text-balance"
          >
            {item.name[lang]}
          </h2>
          {item.description[lang] && (
            <p className="font-body text-base leading-normal text-pretty text-cacao">
              {item.description[lang]}
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-[15px]">
            <span className="font-bold">{formatPrice(item.price, lang)}</span>
            <span className="inline-flex items-center gap-1.5 text-cacao">
              <ClockIcon />
              {etaLabel}
            </span>
          </p>
        </div>

        {bundlePicks(item, menu, selections).map(({ slot, item: picked }) => (
          <div key={slot.id}>
            <SlotFieldset
              slot={slot}
              menu={menu}
              chosen={picked?.id}
              missing={triedSubmit && check.missing.includes(slot.id)}
              onPick={(itemId) => pick(slot, itemId)}
              lang={lang}
              t={t}
            />
            {picked?.groups.map((groupId) => {
              const group = menu.groups[groupId];
              const key = slotKey(slot.id, groupId);
              return (
                group && (
                  <OptionFieldset
                    key={key}
                    fieldKey={key}
                    title={`${picked.name[lang]} · ${group.name[lang]}`}
                    group={group}
                    chosen={selections[key] ?? []}
                    missing={triedSubmit && check.missing.includes(key)}
                    onToggle={(optionId) => toggle(key, group, optionId)}
                    lang={lang}
                    t={t}
                  />
                )
              );
            })}
          </div>
        ))}

        {groups.map((group) => (
          <OptionFieldset
            key={group.id}
            fieldKey={group.id}
            group={group}
            chosen={selections[group.id] ?? []}
            missing={triedSubmit && check.missing.includes(group.id)}
            onToggle={(optionId) => toggle(group.id, group, optionId)}
            lang={lang}
            t={t}
          />
        ))}

        <label className="flex flex-col gap-2 border-t border-dashed border-chocolate/20 px-6 pt-5 pb-6">
          <span className="font-display text-lg leading-tight font-bold">{t.notes}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={ordering.noteMaxLength}
            rows={3}
            placeholder={t.notesPlaceholder}
            className="w-full resize-none rounded-[14px] border-[1.5px] border-chocolate/20 bg-whipped px-4 py-3 font-ui text-[15px] leading-normal placeholder:text-cacao/60 focus:border-blueberry focus:ring-3 focus:ring-blueberry/15 focus:outline-none"
          />
          <span className="self-end font-ui text-xs text-cacao">
            {note.length}/{ordering.noteMaxLength}
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-chocolate/10 bg-vanilla px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
        <QtyStepper
          value={qty}
          onChange={setQty}
          max={ordering.maxQuantity}
          size="lg"
          labels={{ decrease: t.decrease, increase: t.increase, quantity: t.quantity }}
        />
        <button
          type="submit"
          disabled={soldOut}
          className="btn btn-primary btn-lg min-w-0 flex-1 justify-between px-4 text-base disabled:cursor-not-allowed disabled:opacity-60 desk:px-5 desk:text-[17px]"
        >
          <span className="truncate">{soldOut ? t.soldOut : line ? t.update : t.addToOrder}</span>
          {!soldOut && <span>{formatPrice(total, lang)}</span>}
        </button>
      </div>
    </form>
  );
}

type FieldsetProps = {
  /** The selections key: the group id, or "slot/group" inside a bundle. */
  fieldKey: string;
  /** Shown instead of the group's name. */
  title?: string;
  group: OptionGroup;
  chosen: string[];
  missing: boolean;
  onToggle: (optionId: string) => void;
  lang: Locale;
  t: Dictionary["order"];
};

function OptionFieldset({
  fieldKey,
  title,
  group,
  chosen,
  missing,
  onToggle,
  lang,
  t,
}: FieldsetProps) {
  const single = isSingleChoice(group);
  const required = group.min > 0;
  const unlimited = group.max >= group.options.length;
  const full = !single && chosen.length >= group.max;
  const rule = required
    ? `${t.required} · ${single ? t.pickOne : fill(t.upTo, { count: group.max })}`
    : unlimited
      ? t.optional
      : `${t.optional} · ${fill(t.upTo, { count: group.max })}`;

  return (
    <fieldset
      id={`group-${fieldKey}`}
      aria-describedby={`rule-${fieldKey}`}
      className="scroll-mt-4 border-t border-dashed border-chocolate/20 px-6 pt-5 pb-6"
    >
      <legend className="float-start mb-3 flex w-full items-center justify-between gap-3">
        <span className="font-display text-lg leading-tight font-bold">
          {title ?? group.name[lang]}
        </span>
        <span
          id={`rule-${fieldKey}`}
          className={`flex-none rounded-full px-2.5 py-1 font-ui text-xs leading-4 font-bold ${missing ? "bg-raspberry text-whipped" : required ? "bg-blueberry text-vanilla" : "bg-strawberry-milk text-cacao"}`}
        >
          {rule}
        </span>
      </legend>
      {missing && (
        <p
          role="alert"
          className="clear-both mb-3 flex items-center gap-2 font-ui text-sm font-semibold"
        >
          <span
            aria-hidden="true"
            className="flex size-5 flex-none items-center justify-center rounded-full bg-raspberry font-ui text-xs font-bold text-whipped"
          >
            !
          </span>
          {t.chooseOne}
        </p>
      )}
      <div className="clear-both flex flex-col gap-2">
        {group.options.map((option) => {
          const checked = chosen.includes(option.id);
          const disabled = !checked && full;
          return (
            <label
              key={option.id}
              className="group/opt relative flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-chocolate/12 bg-whipped px-4 py-2.5 transition-colors has-checked:border-blueberry has-checked:bg-strawberry-milk has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-caramel has-disabled:cursor-not-allowed has-disabled:opacity-45"
            >
              <input
                type={single && required ? "radio" : "checkbox"}
                name={fieldKey}
                value={option.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(option.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex size-[22px] flex-none items-center justify-center border-2 border-chocolate/45 transition-colors group-has-checked/opt:border-blueberry group-has-checked/opt:bg-blueberry ${single && required ? "rounded-full" : "rounded-[7px]"}`}
              >
                {single && required ? (
                  <span className="size-2 scale-0 rounded-full bg-whipped transition-transform group-has-checked/opt:scale-100" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3.5 scale-0 fill-none stroke-whipped stroke-[3.2] transition-transform [stroke-linecap:round] [stroke-linejoin:round] group-has-checked/opt:scale-100"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              <span className="flex-1 font-ui text-[15px] leading-5 font-medium">
                {option.name[lang]}
              </span>
              <span className="font-ui text-sm font-semibold text-cacao">
                {formatAddOn(option.price, lang)}
              </span>
            </label>
          );
        })}
      </div>
      {full && !unlimited && <p className="mt-2 font-ui text-[13px] text-cacao">{t.maxReached}</p>}
    </fieldset>
  );
}

type SlotProps = {
  slot: BundleSlot;
  menu: Menu;
  /** The picked item's id. */
  chosen: string | undefined;
  missing: boolean;
  onPick: (itemId: string) => void;
  lang: Locale;
  t: Dictionary["order"];
};

/** A bundle slot: the items to pick from (or the one it includes), with surcharges. */
function SlotFieldset({ slot, menu, chosen, missing, onPick, lang, t }: SlotProps) {
  const choices = slot.choices.flatMap((choice) => {
    const item = menu.items.find((i) => i.id === choice.itemId);
    return item ? [{ ...choice, item }] : [];
  });
  const fixed = choices.length === 1;

  return (
    <fieldset
      id={`group-${slot.id}`}
      aria-describedby={`rule-${slot.id}`}
      className="scroll-mt-4 border-t border-dashed border-chocolate/20 px-6 pt-5 pb-6"
    >
      <legend className="float-start mb-3 flex w-full items-center justify-between gap-3">
        <span className="font-display text-lg leading-tight font-bold">{slot.name[lang]}</span>
        <span
          id={`rule-${slot.id}`}
          className={`flex-none rounded-full px-2.5 py-1 font-ui text-xs leading-4 font-bold ${missing ? "bg-raspberry text-whipped" : fixed ? "bg-strawberry-milk text-cacao" : "bg-blueberry text-vanilla"}`}
        >
          {fixed ? t.included : `${t.required} · ${t.pickOne}`}
        </span>
      </legend>
      {missing && (
        <p
          role="alert"
          className="clear-both mb-3 flex items-center gap-2 font-ui text-sm font-semibold"
        >
          <span
            aria-hidden="true"
            className="flex size-5 flex-none items-center justify-center rounded-full bg-raspberry font-ui text-xs font-bold text-whipped"
          >
            !
          </span>
          {t.chooseOne}
        </p>
      )}
      <div className="clear-both flex flex-col gap-2">
        {choices.map(({ item, price }) => {
          const soldOut = item.available === false;
          const content = (
            <>
              <ItemImage item={item} sizes="44px" className="size-11 flex-none rounded-[10px]" />
              <span className="flex-1 font-ui text-[15px] leading-5 font-medium">
                {item.name[lang]}
              </span>
              <span className="font-ui text-sm font-semibold text-cacao">
                {soldOut ? t.soldOut : formatAddOn(price, lang)}
              </span>
            </>
          );
          if (fixed)
            return (
              <div
                key={item.id}
                className="flex min-h-[52px] items-center gap-3 rounded-[14px] border-[1.5px] border-chocolate/12 bg-whipped px-3 py-2"
              >
                {content}
              </div>
            );
          return (
            <label
              key={item.id}
              className="group/opt relative flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-chocolate/12 bg-whipped px-3 py-2 transition-colors has-checked:border-blueberry has-checked:bg-strawberry-milk has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-caramel has-disabled:cursor-not-allowed has-disabled:opacity-45"
            >
              <input
                type="radio"
                name={slot.id}
                value={item.id}
                checked={chosen === item.id}
                disabled={soldOut}
                onChange={() => onPick(item.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="flex size-[22px] flex-none items-center justify-center rounded-full border-2 border-chocolate/45 transition-colors group-has-checked/opt:border-blueberry group-has-checked/opt:bg-blueberry"
              >
                <span className="size-2 scale-0 rounded-full bg-whipped transition-transform group-has-checked/opt:scale-100" />
              </span>
              {content}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 flex-none fill-none stroke-blueberry stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
