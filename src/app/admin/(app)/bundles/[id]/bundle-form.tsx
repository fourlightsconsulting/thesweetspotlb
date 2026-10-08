"use client";

import { useActionState, useState } from "react";
import { idle, useSubmit } from "@/components/admin/form";
import { money } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { ItemBasics, type ItemValues, SaveBar } from "../../menu/items/[id]/item-form";
import { deleteBundle, saveBundle } from "../actions";

export type MenuChoice = { id: string; name: string; price: number; categoryLabel: string };

export type Slot = {
  /** Local only, for React keys. */
  key: string;
  groupId?: string;
  nameEn: string;
  nameAr: string;
  mode: "fixed" | "pick";
  choices: { productId: string; surcharge: number }[];
  sourceCategoryId: string | null;
};

type Props = {
  bundle: ItemValues;
  slots: Slot[];
  categories: { id: string; label: string }[];
  items: MenuChoice[];
};

let nextKey = 0;
const newSlot = (): Slot => ({
  key: `new-${nextKey++}`,
  nameEn: "",
  nameAr: "",
  mode: "pick",
  choices: [],
  sourceCategoryId: null,
});

/** A bundle's editor: the usual item fields, then its parts. */
export function BundleForm({ bundle, slots: initialSlots, categories, items }: Props) {
  const [state, action, pending] = useActionState(saveBundle, idle);
  const submit = useSubmit(action);
  const [slots, setSlots] = useState(initialSlots.length > 0 ? initialSlots : [newSlot()]);
  const [price, setPrice] = useState(bundle.price);

  const update = (key: string, patch: Partial<Slot>) =>
    setSlots((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const move = (index: number, by: -1 | 1) =>
    setSlots((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  const payload = slots.map((s) => ({
    groupId: s.groupId,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    choices:
      s.mode === "fixed" ? s.choices.slice(0, 1).map((c) => ({ ...c, surcharge: 0 })) : s.choices,
    sourceCategoryId: s.mode === "fixed" ? null : s.sourceCategoryId,
  }));
  const extra = (s: (typeof payload)[number], pick: "min" | "max") => {
    const surcharges = [...s.choices.map((c) => c.surcharge), ...(s.sourceCategoryId ? [0] : [])];
    if (surcharges.length === 0) return 0;
    return pick === "min" ? Math.min(...surcharges) : Math.max(...surcharges);
  };
  const low = price + payload.reduce((sum, s) => sum + extra(s, "min"), 0);
  const high = price + payload.reduce((sum, s) => sum + extra(s, "max"), 0);

  return (
    <form
      onSubmit={submit}
      onChange={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.name === "price")
          setPrice(Math.round(Number(target.value) * 100) || 0);
      }}
      className="flex flex-col gap-6"
    >
      {bundle.id && <input type="hidden" name="id" value={bundle.id} />}
      <input type="hidden" name="slots" value={JSON.stringify(payload)} />
      <ItemBasics item={bundle} categories={categories} />

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">What’s in it</h2>
            <p className="mt-1 text-muted">
              Each part is either set, or one pick from a list. Picked items keep their own choices
              and add-ons, at their usual prices.
            </p>
          </div>
          <p className="rounded-[10px] bg-accent-soft px-3 py-2 text-[13px]">
            Costs{" "}
            <span className="font-bold tabular-nums">
              {low === high ? money(low) : `${money(low)}–${money(high)}`}
            </span>{" "}
            before add-ons
          </p>
        </div>

        <ol className="mt-4 flex flex-col gap-3">
          {slots.map((slot, index) => (
            <SlotEditor
              key={slot.key}
              slot={slot}
              index={index}
              count={slots.length}
              items={items}
              categories={categories}
              onChange={(patch) => update(slot.key, patch)}
              onMove={(by) => move(index, by)}
              onRemove={() => setSlots((list) => list.filter((s) => s.key !== slot.key))}
            />
          ))}
        </ol>
        <button
          type="button"
          disabled={slots.length >= 10}
          onClick={() => setSlots((list) => [...list, newSlot()])}
          className="btn btn-secondary mt-4"
        >
          <Icon name="plus" className="size-4" />
          Add a part
        </button>
      </section>

      <SaveBar
        saved={bundle.id !== null}
        pending={pending}
        state={state}
        name={bundle.nameEn}
        addLabel="Add the bundle"
        deleteLabel="Delete bundle"
        deleteWarning="Its orders stay in the records. To take it off for now, switch “Listed on the menu” off instead."
        onDelete={() => deleteBundle(bundle.id!)}
      />
    </form>
  );
}

function SlotEditor({
  slot,
  index,
  count,
  items,
  categories,
  onChange,
  onMove,
  onRemove,
}: {
  slot: Slot;
  index: number;
  count: number;
  items: MenuChoice[];
  categories: { id: string; label: string }[];
  onChange: (patch: Partial<Slot>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [adding, setAdding] = useState("");
  const itemOf = (id: string) => items.find((i) => i.id === id);
  const available = items.filter((i) => !slot.choices.some((c) => c.productId === i.id));
  const prefix = `slot-${slot.key}`;

  return (
    <li className="rounded-[12px] border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Part {index + 1}</p>
        <div className="flex">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="up" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="down" className="size-4" />
          </button>
          <button
            type="button"
            disabled={count === 1}
            onClick={onRemove}
            className="btn btn-ghost btn-sm text-bad"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor={`${prefix}-en`} className="label">
            Name
          </label>
          <input
            id={`${prefix}-en`}
            value={slot.nameEn}
            onChange={(e) => onChange({ nameEn: e.target.value })}
            maxLength={80}
            placeholder="Your crêpe"
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-ar`} className="label">
            Name in Arabic
          </label>
          <input
            id={`${prefix}-ar`}
            value={slot.nameAr}
            onChange={(e) => onChange({ nameAr: e.target.value })}
            maxLength={80}
            lang="ar"
            dir="rtl"
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-mode`} className="label">
            Kind
          </label>
          <select
            id={`${prefix}-mode`}
            value={slot.mode}
            onChange={(e) => onChange({ mode: e.target.value as Slot["mode"] })}
            className="field"
          >
            <option value="pick">The customer picks</option>
            <option value="fixed">A set item</option>
          </select>
        </div>
      </div>

      {slot.mode === "fixed" ? (
        <div className="mt-3 max-w-md">
          <label htmlFor={`${prefix}-item`} className="label">
            Item
          </label>
          <select
            id={`${prefix}-item`}
            value={slot.choices[0]?.productId ?? ""}
            onChange={(e) =>
              onChange({
                choices: e.target.value ? [{ productId: e.target.value, surcharge: 0 }] : [],
              })
            }
            className="field"
          >
            <option value="">Choose an item…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.categoryLabel})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mt-3">
          <p className="label">Items to pick from, with any extra charge</p>
          <ul className="flex flex-col divide-y divide-line">
            {slot.choices.map((choice) => {
              const item = itemOf(choice.productId);
              return (
                <li key={choice.productId} className="flex items-center gap-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate">
                    {item?.name ?? "A removed item"}
                    {item && (
                      <span className="text-[13px] text-muted"> · {money(item.price)} alone</span>
                    )}
                  </span>
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
                      +$
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      value={(choice.surcharge / 100).toString()}
                      onChange={(e) =>
                        onChange({
                          choices: slot.choices.map((c) =>
                            c.productId === choice.productId
                              ? {
                                  ...c,
                                  surcharge: Math.max(
                                    0,
                                    Math.round(Number(e.target.value) * 100) || 0,
                                  ),
                                }
                              : c,
                          ),
                        })
                      }
                      aria-label={`Extra for ${item?.name ?? "this item"}`}
                      className="field min-h-[34px] py-1 ps-8"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item?.name ?? "item"}`}
                    onClick={() =>
                      onChange({
                        choices: slot.choices.filter((c) => c.productId !== choice.productId),
                      })
                    }
                    className="btn btn-ghost btn-sm px-1.5 text-bad"
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="Item to add"
              className="field w-auto max-w-full"
            >
              <option value="">Add an item…</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.categoryLabel})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!adding}
              onClick={() => {
                onChange({ choices: [...slot.choices, { productId: adding, surcharge: 0 }] });
                setAdding("");
              }}
              className="btn btn-secondary"
            >
              Add
            </button>
          </div>
          <div className="mt-3 max-w-md">
            <label htmlFor={`${prefix}-source`} className="label">
              Also offer every item in a category{" "}
              <span className="font-normal text-muted">(at no extra)</span>
            </label>
            <select
              id={`${prefix}-source`}
              value={slot.sourceCategoryId ?? ""}
              onChange={(e) => onChange({ sourceCategoryId: e.target.value || null })}
              className="field"
            >
              <option value="">No</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="hint">New items in that category join the choices by themselves.</p>
          </div>
        </div>
      )}
    </li>
  );
}
