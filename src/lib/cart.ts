// The cart: a small external store kept in localStorage, shared by the header
// count, the order page and checkout, and synced across tabs. Lines hold ids
// only; prices are always worked out from the current menu.
import { useSyncExternalStore } from "react";
import { type Fulfilment, ordering } from "@/data/ordering";
import { lineSignature, type Selections } from "@/lib/pricing";

export type CartLine = {
  key: string;
  itemId: string;
  qty: number;
  selections: Selections;
  note: string;
};

export type Cart = { lines: CartLine[]; mode: Fulfilment };

const STORAGE_KEY = "tss.cart.v1";
const EMPTY: Cart = { lines: [], mode: "pickup" };

let cart: Cart = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Accepts only well-formed data, so a stale or edited entry can't break the page. */
function parse(raw: string): Cart {
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || !Array.isArray(data.lines)) return EMPTY;
  const lines: CartLine[] = [];
  for (const line of data.lines.slice(0, ordering.maxLines)) {
    if (!isRecord(line) || typeof line.itemId !== "string" || !isRecord(line.selections)) continue;
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1) continue;
    const selections: Selections = {};
    for (const [group, ids] of Object.entries(line.selections)) {
      if (Array.isArray(ids)) selections[group] = ids.filter((id) => typeof id === "string");
    }
    lines.push({
      key: typeof line.key === "string" ? line.key : newKey(),
      itemId: line.itemId,
      qty: Math.min(qty, ordering.maxQuantity),
      selections,
      note: typeof line.note === "string" ? line.note.slice(0, ordering.noteMaxLength) : "",
    });
  }
  return { lines, mode: data.mode === "delivery" ? "delivery" : "pickup" };
}

function read(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parse(raw) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: Cart) {
  cart = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the cart still works for this page view.
  }
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  cart = read();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (!loaded) {
    loaded = true;
    cart = read();
  }
  return cart;
}

// Pages are prerendered, so the server (and hydration) always sees an empty cart.
const getServerSnapshot = () => EMPTY;

export const useCart = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export const itemCount = (c: Cart) => c.lines.reduce((sum, line) => sum + line.qty, 0);

/** Adds `line` to the lines, merging it into an identical one (same item, choices and note). */
function mergeInto(lines: CartLine[], line: CartLine) {
  const signature = lineSignature(line.itemId, line.selections, line.note);
  const twin = lines.find(
    (l) => l.key !== line.key && lineSignature(l.itemId, l.selections, l.note) === signature,
  );
  if (!twin) return [...lines, line];
  return lines.map((l) =>
    l === twin ? { ...l, qty: Math.min(l.qty + line.qty, ordering.maxQuantity) } : l,
  );
}

export const cartActions = {
  add(line: Omit<CartLine, "key">) {
    const current = getSnapshot();
    if (current.lines.length >= ordering.maxLines) return;
    commit({ ...current, lines: mergeInto(current.lines, { ...line, key: newKey() }) });
  },
  /** Replaces a line after editing it in the customiser. */
  update(key: string, line: Omit<CartLine, "key">) {
    const current = getSnapshot();
    const rest = current.lines.filter((l) => l.key !== key);
    if (rest.length === current.lines.length) return;
    const index = current.lines.findIndex((l) => l.key === key);
    const merged = mergeInto(rest, { ...line, key });
    // Keep the edited line where it was, unless it merged into another one.
    const edited = merged.find((l) => l.key === key);
    if (edited) {
      const withoutEdited = merged.filter((l) => l.key !== key);
      withoutEdited.splice(index, 0, edited);
      commit({ ...current, lines: withoutEdited });
    } else commit({ ...current, lines: merged });
  },
  setQty(key: string, qty: number) {
    const current = getSnapshot();
    const lines =
      qty <= 0
        ? current.lines.filter((l) => l.key !== key)
        : current.lines.map((l) =>
            l.key === key ? { ...l, qty: Math.min(qty, ordering.maxQuantity) } : l,
          );
    commit({ ...current, lines });
  },
  remove(key: string) {
    const current = getSnapshot();
    commit({ ...current, lines: current.lines.filter((l) => l.key !== key) });
  },
  /** Drops lines the current menu can't price (removed items or options). */
  keepOnly(valid: (line: CartLine) => boolean) {
    const current = getSnapshot();
    const lines = current.lines.filter(valid);
    if (lines.length !== current.lines.length) commit({ ...current, lines });
  },
  setMode(mode: Fulfilment) {
    const current = getSnapshot();
    if (current.mode !== mode) commit({ ...current, mode });
  },
  clear() {
    commit({ ...getSnapshot(), lines: [] });
  },
};
