"use client";

import { useActionState, useState, useTransition } from "react";
import { Help } from "@/components/admin/help";
import { type FormState, FormStatus, idle, useSubmit } from "@/components/admin/form";
import { money } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { Switch } from "@/components/admin/switch";
import { deleteItem, saveItem } from "../../actions";

export type ChoiceGroup = {
  id: string;
  nameEn: string;
  min: number;
  max: number;
  options: { key: string; nameEn: string; price: number }[];
};

export type ItemValues = {
  id: string | null;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categoryId: string;
  price: number;
  tag: "" | "fav" | "new" | "limited";
  imagePath: string | null;
  imageSrc: string | null;
  active: boolean;
  online: boolean;
  available: boolean;
  groups: { groupId: string; defaults: string[] }[];
};

export const ruleLabel = (g: Pick<ChoiceGroup, "min" | "max">) =>
  g.min > 0
    ? g.max === 1
      ? "Required · pick one"
      : `Required · pick ${g.min}–${g.max}`
    : g.max === 1
      ? "Optional · up to one"
      : `Optional · up to ${g.max}`;

type Props = {
  item: ItemValues;
  categories: { id: string; label: string }[];
  groups: ChoiceGroup[];
};

/** An item's editor: text, price, photo, visibility and its choices. */
export function ItemForm({ item, categories, groups }: Props) {
  const [state, action, pending] = useActionState(saveItem, idle);
  const submit = useSubmit(action);
  const [attached, setAttached] = useState(item.groups);
  const [adding, setAdding] = useState("");

  const groupOf = (id: string) => groups.find((g) => g.id === id);
  const unattached = groups.filter((g) => !attached.some((a) => a.groupId === g.id));
  const update = (index: number, defaults: string[]) =>
    setAttached((list) => list.map((a, i) => (i === index ? { ...a, defaults } : a)));
  const move = (index: number, by: -1 | 1) =>
    setAttached((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="groups" value={JSON.stringify(attached)} />

      <ItemBasics item={item} categories={categories} />

      <section className="card p-5">
        <h2 className="text-base font-bold">
          Choices & add-ons
          <Help>Shown to the customer in this order. Preselected choices start ticked.</Help>
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {attached.map((a, index) => {
            const group = groupOf(a.groupId);
            if (!group) return null;
            return (
              <li key={a.groupId} className="rounded-[12px] border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold">{group.nameEn}</span>{" "}
                    <span className="text-[13px] text-muted">{ruleLabel(group)}</span>
                  </p>
                  <div className="flex">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="btn btn-ghost btn-sm px-1.5"
                    >
                      <Icon name="up" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === attached.length - 1}
                      onClick={() => move(index, 1)}
                      className="btn btn-ghost btn-sm px-1.5"
                    >
                      <Icon name="down" className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttached((list) => list.filter((_, i) => i !== index))}
                      className="btn btn-ghost btn-sm text-bad"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {group.max === 1 ? (
                  <label className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                    Preselected:
                    <select
                      value={a.defaults[0] ?? ""}
                      onChange={(e) => update(index, e.target.value ? [e.target.value] : [])}
                      className="field h-[30px] min-h-[30px] w-auto py-1 text-[13px]"
                    >
                      <option value="">
                        {group.min > 0 ? "None: the customer picks" : "None"}
                      </option>
                      {group.options.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.nameEn}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    {group.options.map((o) => (
                      <label key={o.key} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={a.defaults.includes(o.key)}
                          onChange={(e) =>
                            update(
                              index,
                              e.target.checked
                                ? [...a.defaults, o.key]
                                : a.defaults.filter((k) => k !== o.key),
                            )
                          }
                          className="accent-accent"
                        />
                        {o.nameEn}
                        {o.price > 0 && <span className="text-muted">+{money(o.price)}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {attached.length === 0 && <li className="text-muted">No choices</li>}
        </ul>
        {unattached.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="Choices to add"
              className="field w-auto"
            >
              <option value="">Add choices…</option>
              {unattached.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nameEn} ({ruleLabel(g).toLowerCase()})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!adding}
              onClick={() => {
                setAttached((list) => [...list, { groupId: adding, defaults: [] }]);
                setAdding("");
              }}
              className="btn btn-secondary"
            >
              Add
            </button>
          </div>
        )}
      </section>

      <SaveBar
        saved={item.id !== null}
        pending={pending}
        state={state}
        name={item.nameEn}
        addLabel="Add to the menu"
        deleteLabel="Delete item"
        deleteWarning="It also leaves any bundle it’s in. To take it off for now, switch “Listed on the menu” off instead."
        onDelete={() => deleteItem(item.id!)}
      />
    </form>
  );
}

/** Names, description, category, price, tag, photo and visibility: shared by items and bundles. */
export function ItemBasics({
  item,
  categories,
}: {
  item: ItemValues;
  categories: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(item.active);
  const [online, setOnline] = useState(item.online);
  const [available, setAvailable] = useState(item.available);
  return (
    <>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="nameEn" className="label">
            Name
          </label>
          <input
            id="nameEn"
            name="nameEn"
            required
            maxLength={80}
            defaultValue={item.nameEn}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="nameAr" className="label">
            Name in Arabic
          </label>
          <input
            id="nameAr"
            name="nameAr"
            required
            maxLength={80}
            defaultValue={item.nameAr}
            lang="ar"
            dir="rtl"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="descriptionEn" className="label">
            Description
          </label>
          <textarea
            id="descriptionEn"
            name="descriptionEn"
            rows={3}
            maxLength={300}
            defaultValue={item.descriptionEn}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="descriptionAr" className="label">
            Description in Arabic
          </label>
          <textarea
            id="descriptionAr"
            name="descriptionAr"
            rows={3}
            maxLength={300}
            defaultValue={item.descriptionAr}
            lang="ar"
            dir="rtl"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="categoryId" className="label">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={item.categoryId}
            className="field"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="label">
              Price ($)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              step={0.01}
              required
              defaultValue={item.id ? (item.price / 100).toFixed(2) : ""}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="tag" className="label">
              Tag
            </label>
            <select id="tag" name="tag" defaultValue={item.tag} className="field">
              <option value="">None</option>
              <option value="fav">Favourite</option>
              <option value="new">New</option>
              <option value="limited">Limited</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card grid gap-6 p-5 sm:grid-cols-2">
        <PhotoUpload
          name="imagePath"
          path={item.imagePath}
          src={item.imageSrc}
          folder="items"
          label="Photo"
        />
        <div className="flex flex-col gap-3">
          <span className="label mb-0">On the website</span>
          {(
            [
              [active, setActive, "active", "Listed on the menu", "Off hides it everywhere."],
              [
                online,
                setOnline,
                "online",
                "Orderable online",
                "Off: shown, but in the shop only.",
              ],
              [available, setAvailable, "available", "Available", "Off marks it sold out for now."],
            ] as const
          ).map(([value, set, key, title, hint]) => (
            <div key={key} className="flex items-start gap-3">
              <Switch checked={value} onChange={set} label={title} name={key} />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-[13px] text-muted">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** The sticky save bar with delete, at the bottom of an item or bundle form. */
export function SaveBar({
  saved,
  pending,
  state,
  name,
  addLabel,
  deleteLabel,
  deleteWarning,
  onDelete,
}: {
  saved: boolean;
  pending: boolean;
  state: FormState;
  name: string;
  addLabel: string;
  deleteLabel: string;
  deleteWarning: string;
  onDelete: () => Promise<{ error: string | null }>;
}) {
  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  return (
    <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur wide:-mx-8 wide:px-8">
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : saved ? "Save changes" : addLabel}
      </button>
      <FormStatus state={state} />
      {saved && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (confirm(`Delete ${name} for good? ${deleteWarning}`))
              startDeleting(async () => setDeleteError((await onDelete()).error));
          }}
          className="btn btn-danger ms-auto"
        >
          {deleting ? "Deleting…" : deleteLabel}
        </button>
      )}
      {deleteError && <p className="w-full text-[13px] text-bad">{deleteError}</p>}
    </div>
  );
}
