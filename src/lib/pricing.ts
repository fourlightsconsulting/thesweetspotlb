// Pure pricing and selection rules, shared by the browser (display) and the
// server (the authoritative total). Money is integer cents.
//
// Bundles: each slot holds one pick, selections[slot] = [itemId], and the
// picked item's own choices sit under "slot/group" keys, at their usual
// prices. A bundle costs its price, plus each pick's surcharge, plus those
// choices (and any choices of the bundle itself).
import type { Localized, Menu, MenuItem, OptionGroup } from "@/data/menu";
import type { Locale } from "@/i18n/config";

/** Chosen option ids per group id. Single-choice groups hold one id. */
export type Selections = Record<string, string[]>;

/** What the rules need from the menu: its items (bundle picks) and option groups. */
export type MenuLookup = Pick<Menu, "items" | "groups">;

type Groups = Record<string, OptionGroup>;

export const isSingleChoice = (group: OptionGroup) => group.max === 1;

/** The selections key for a picked item's own group inside a bundle slot. */
export const slotKey = (slotId: string, groupId: string) => `${slotId}/${groupId}`;

const findItem = (menu: MenuLookup, id: string | undefined) =>
  id === undefined ? undefined : menu.items.find((i) => i.id === id && !i.slots);

/** An item's preselected options, under `prefix/` when it's a bundle pick. */
function itemDefaults(item: MenuItem, groups: Groups, prefix?: string): Selections {
  const out: Selections = {};
  for (const id of item.groups) {
    if (!groups[id]) continue;
    const preset = item.defaults?.[id];
    out[prefix ? slotKey(prefix, id) : id] =
      preset === undefined ? [] : Array.isArray(preset) ? [...preset] : [preset];
  }
  return out;
}

/**
 * Where the customiser starts: the item's preselected options. Required
 * choices without one start empty, so the customer picks on purpose. In a
 * bundle, a slot with a single item (a fixed part) is picked already.
 */
export function defaultSelections(item: MenuItem, menu: MenuLookup): Selections {
  const out = itemDefaults(item, menu.groups);
  for (const slot of item.slots ?? []) {
    const only = slot.choices.length === 1 ? findItem(menu, slot.choices[0].itemId) : undefined;
    out[slot.id] = only ? [only.id] : [];
    if (only) Object.assign(out, itemDefaults(only, menu.groups, slot.id));
  }
  return out;
}

/** The selections a bundle slot starts with once `item` is picked in it. */
export const pickDefaults = (item: MenuItem, menu: MenuLookup, slotId: string) =>
  itemDefaults(item, menu.groups, slotId);

/** Each slot's picked item and its surcharge, for a bundle. */
export function bundlePicks(item: MenuItem, menu: MenuLookup, selections: Selections) {
  return (item.slots ?? []).map((slot) => {
    const pickedId = selections[slot.id]?.[0];
    const choice = slot.choices.find((c) => c.itemId === pickedId);
    return { slot, choice, item: choice ? findItem(menu, choice.itemId) : undefined };
  });
}

/** Checks one item's groups (under `prefix/` for a bundle pick); collects the keys it used. */
function checkGroups(
  item: MenuItem,
  groups: Groups,
  selections: Selections,
  used: Set<string>,
  prefix?: string,
) {
  const missing: string[] = [];
  let invalid = false;
  for (const id of item.groups) {
    const key = prefix ? slotKey(prefix, id) : id;
    used.add(key);
    const group = groups[id];
    if (!group) {
      invalid = true;
      continue;
    }
    const chosen = selections[key] ?? [];
    if (new Set(chosen).size !== chosen.length) invalid = true;
    if (chosen.some((optionId) => !group.options.some((o) => o.id === optionId))) invalid = true;
    if (chosen.length > group.max) invalid = true;
    if (chosen.length < group.min) missing.push(key);
  }
  return { missing, invalid };
}

/**
 * Checks a selection against the item's groups (and a bundle's slots).
 * Returns the problem keys: `missing` (fewer than min, or an empty slot),
 * plus whether anything unknown, unavailable or over the limit was sent
 * (`invalid`), which only a tampered or stale request can do.
 */
export function checkSelections(item: MenuItem, menu: MenuLookup, selections: Selections) {
  const used = new Set<string>();
  const missing: string[] = [];
  let invalid = false;

  for (const { slot, choice, item: picked } of bundlePicks(item, menu, selections)) {
    used.add(slot.id);
    const chosen = selections[slot.id] ?? [];
    if (chosen.length > 1) invalid = true;
    if (chosen.length === 0) {
      missing.push(slot.id);
      continue;
    }
    if (!choice || !picked || picked.available === false) {
      invalid = true;
      continue;
    }
    const own = checkGroups(picked, menu.groups, selections, used, slot.id);
    missing.push(...own.missing);
    invalid ||= own.invalid;
  }

  const own = checkGroups(item, menu.groups, selections, used);
  missing.push(...own.missing);
  invalid ||= own.invalid;
  for (const key of Object.keys(selections)) {
    if (!used.has(key) && selections[key].length > 0) invalid = true;
  }
  return { missing, invalid, ok: !invalid && missing.length === 0 };
}

/** One chosen option, or a bundle's pick, as priced and described. */
export type ChosenOption = {
  /** The selections key: a group id, a slot id, or "slot/group". */
  key: string;
  groupName: Localized;
  id: string;
  name: Localized;
  price: number;
  /** A bundle slot's pick (the item), rather than an option. */
  pick?: boolean;
  /** The slot a picked item's option belongs to. */
  slot?: string;
  /** A single choice that was preselected (left out of descriptions). */
  isDefault?: boolean;
};

function chosenFor(item: MenuItem, groups: Groups, selections: Selections, prefix?: string) {
  const defaults = itemDefaults(item, groups);
  return item.groups.flatMap((id) => {
    const group = groups[id];
    if (!group) return [];
    const key = prefix ? slotKey(prefix, id) : id;
    return (selections[key] ?? []).flatMap((optionId): ChosenOption[] => {
      const option = group.options.find((o) => o.id === optionId);
      if (!option) return [];
      return [
        {
          key,
          groupName: group.name,
          id: option.id,
          name: option.name,
          price: option.price,
          ...(prefix ? { slot: prefix } : {}),
          ...(isSingleChoice(group) && defaults[id]?.[0] === optionId ? { isDefault: true } : {}),
        },
      ];
    });
  });
}

/** Everything chosen on a line, in order: each bundle pick with its options, then the item's own. */
export function chosenOptions(item: MenuItem, menu: MenuLookup, selections: Selections) {
  const picks = bundlePicks(item, menu, selections).flatMap(({ slot, choice, item: picked }) =>
    choice && picked
      ? [
          {
            key: slot.id,
            groupName: slot.name,
            id: picked.id,
            name: picked.name,
            price: choice.price,
            pick: true,
          } satisfies ChosenOption,
          ...chosenFor(picked, menu.groups, selections, slot.id),
        ]
      : [],
  );
  return [...picks, ...chosenFor(item, menu.groups, selections)];
}

/** Base price plus every pick's surcharge and every selected option. */
export function unitPrice(item: MenuItem, menu: MenuLookup, selections: Selections) {
  return chosenOptions(item, menu, selections).reduce((sum, o) => sum + o.price, item.price);
}

/**
 * The short line under an item in the order ("Chocolate · Banana · Hazelnut
 * crunch"): every add-on, plus single choices that differ from the default.
 * Bundles list each pick with its own: "Nutella Crêpe (Strawberries) · Oreo
 * Milkshake".
 */
export function describeSelections(
  item: MenuItem,
  menu: MenuLookup,
  selections: Selections,
  lang: Locale,
) {
  const chosen = chosenOptions(item, menu, selections);
  const parts: string[] = [];
  for (const option of chosen) {
    if (option.slot || option.isDefault) continue;
    if (!option.pick) {
      parts.push(option.name[lang]);
      continue;
    }
    const own = chosen
      .filter((o) => o.slot === option.key && !o.isDefault)
      .map((o) => o.name[lang]);
    parts.push(
      own.length > 0
        ? `${option.name[lang]} (${own.join(lang === "ar" ? "، " : ", ")})`
        : option.name[lang],
    );
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
    if (!item || item.available === false || !checkSelections(item, menu, line.selections).ok) {
      invalid.push(line);
      continue;
    }
    const unit = unitPrice(item, menu, line.selections);
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
