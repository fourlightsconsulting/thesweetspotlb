"use client";

import { useActionState, useState, useTransition } from "react";
import { type FormState, FormStatus, idle, useSubmit } from "@/components/admin/form";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { Switch } from "@/components/admin/switch";
import type { GroupDraft, Template } from "@/lib/item-groups";
import { deleteItem, saveItem } from "../../actions";
import { GroupEditor } from "./group-editor";

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
};

type Props = {
  item: ItemValues;
  categories: { id: string; label: string }[];
  groups: GroupDraft[];
  templates: Template[];
};

/** An item's editor: text, price, photo, visibility and its choices. */
export function ItemForm({ item, categories, groups, templates }: Props) {
  const [state, action, pending] = useActionState(saveItem, idle);
  const submit = useSubmit(action);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {item.id && <input type="hidden" name="id" value={item.id} />}

      <ItemBasics item={item} categories={categories} />

      {/* Starts over from what's saved, so new groups and choices pick up their keys. */}
      <GroupEditor key={JSON.stringify(groups)} initial={groups} templates={templates} />

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
