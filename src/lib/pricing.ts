// Pure pricing and selection rules, shared by the browser (display) and the
// server (the authoritative total). Money is integer cents.
import type { Menu, MenuItem, OptionGroup } from "@/data/menu";
import type { Locale } from "@/i18n/config";

/** Chosen option ids per group id. Single-choice groups hold one id. */
export type Selections = Record<string, string[]>;

type Groups = Record<string, OptionGroup>;

export const isSingleChoice = (group: OptionGroup) => group.max === 1;

/**
 * Where the customiser starts: the item's preselected options. Required
 * choices without one start empty, so the customer picks on purpose.
 */
export function defaultSelections(item: MenuItem, groups: Groups): Selections {
  const out: Selections = {};
  for (const id of item.groups) {
    if (!groups[id]) continue;
    const preset = item.defaults?.[id];
    out[id] = preset === undefined ? [] : Array.isArray(preset) ? [...preset] : [preset];
  }
  return out;
}

/**
 * Checks a selection against the item's groups. Returns the problem groups:
 * `missing` (fewer than min), plus whether anything unknown or over the limit
 * was sent (`invalid`), which only a tampered or stale request can do.
 */
export function checkSelections(item: MenuItem, groups: Groups, selections: Selections) {
  const missing: string[] = [];
  let invalid = false;
  for (const key of Object.keys(selections)) {
    if (!item.groups.includes(key)) invalid = true;
  }
  for (const id of item.groups) {
    const group = groups[id];
    if (!group) {
      invalid = true;
      continue;
    }
    const chosen = selections[id] ?? [];
    if (new Set(chosen).size !== chosen.length) invalid = true;
    if (chosen.some((optionId) => !group.options.some((o) => o.id === optionId))) invalid = true;
    if (chosen.length > group.max) invalid = true;
    if (chosen.length < group.min) missing.push(id);
  }
  return { missing, invalid, ok: !invalid && missing.length === 0 };
}

/** Base price plus every selected option's add-on. */
export function unitPrice(item: MenuItem, groups: Groups, selections: Selections) {
  let price = item.price;
  for (const id of item.groups) {
    const group = groups[id];
    for (const optionId of selections[id] ?? []) {
      price += group?.options.find((o) => o.id === optionId)?.price ?? 0;
    }
  }
  return price;
}

/**
 * The short line under an item in the order ("Chocolate · Banana · Hazelnut
 * crunch"): every add-on, plus single choices that differ from the default.
 */
export function describeSelections(
  item: MenuItem,
  groups: Groups,
  selections: Selections,
  lang: Locale,
) {
  const defaults = defaultSelections(item, groups);
  const parts: string[] = [];
  for (const id of item.groups) {
    const group = groups[id];
    if (!group) continue;
    for (const optionId of selections[id] ?? []) {
      if (isSingleChoice(group) && defaults[id]?.[0] === optionId) continue;
      const found = group.options.find((o) => o.id === optionId);
      if (found) parts.push(found.name[lang]);
    }
  }
  return parts.join(" · ");
}

export type LineInput = { itemId: string; qty: number; selections: Selections };

/**
 * Prices order lines against the menu. Lines it can't price (item gone or
 * sold out, choices no longer valid) come back in `invalid`.
 */
export function priceLines<L extends LineInput>(lines: L[], menu: Menu) {
  const priced: { line: L; item: MenuItem; unit: number; total: number }[] = [];
  const invalid: L[] = [];
  for (const line of lines) {
    const item = menu.items.find((i) => i.id === line.itemId);
    if (
      !item ||
      item.available === false ||
      !checkSelections(item, menu.groups, line.selections).ok
    ) {
      invalid.push(line);
      continue;
    }
    const unit = unitPrice(item, menu.groups, line.selections);
    priced.push({ line, item, unit, total: unit * line.qty });
  }
  return { priced, invalid, subtotal: priced.reduce((sum, p) => sum + p.total, 0) };
}

/** A stable key for "same item, same choices, same note", so identical lines merge. */
export function lineSignature(itemId: string, selections: Selections, note: string) {
  const sorted = Object.keys(selections)
    .filter((k) => selections[k].length > 0)
    .sort()
    .map((k) => [k, [...selections[k]].sort()]);
  return JSON.stringify([itemId, sorted, note.trim()]);
}

/** The public rule of an applied promo code; enough to recompute the discount as the order changes. */
export type PromoRule = {
  code: string;
  kind: "percent" | "amount";
  /** Percent (20 = 20%) or cents off. */
  value: number;
  /** Cents; the code only works from this subtotal. */
  minSubtotal?: number;
  /** Cents; caps a percentage discount. */
  maxDiscount?: number;
};

export function promoDiscount(rule: PromoRule | null | undefined, subtotal: number) {
  if (!rule || subtotal <= 0) return 0;
  if (rule.minSubtotal && subtotal < rule.minSubtotal) return 0;
  const raw = rule.kind === "percent" ? Math.round((subtotal * rule.value) / 100) : rule.value;
  return Math.min(raw, rule.maxDiscount ?? Infinity, subtotal);
}

export type Totals = { subtotal: number; discount: number; deliveryFee: number; total: number };

/** Discounts apply to the food only; the delivery fee is charged in full. */
export function orderTotals(subtotal: number, deliveryFee: number, promo?: PromoRule | null) {
  const discount = promoDiscount(promo, subtotal);
  const fee = subtotal > 0 ? deliveryFee : 0;
  return {
    subtotal,
    discount,
    deliveryFee: fee,
    total: subtotal - discount + fee,
  } satisfies Totals;
}
