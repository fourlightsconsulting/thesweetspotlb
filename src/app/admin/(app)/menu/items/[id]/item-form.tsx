"use client";

import { useActionState, useState, useTransition } from "react";
import { idle, useSubmit } from "@/components/admin/form";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { SaveBar, useDirtyForm, useUnsavedGuard } from "@/components/admin/save-bar";
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

/** An item's editor: text and price beside its photo and visibility, then its choices. */
export function ItemForm({ item, categories, groups, templates }: Props) {
  const [state, action, pending] = useActionState(saveItem, idle);
  const submit = useSubmit(action);
  const { formRef, dirty, settle } = useDirtyForm(state.status === "saved" ? state.at : 0);
  const [version, setVersion] = useState(0);
  useUnsavedGuard(dirty);

  return (
    <form ref={formRef} onSubmit={submit}>
      {item.id && <input type="hidden" name="id" value={item.id} />}
      {/* A discard starts over from what's saved; so does a save, so new groups pick up keys. */}
      <div
        key={`${version}:${JSON.stringify(groups)}:${JSON.stringify(item)}`}
        className="flex flex-col gap-6"
      >
        <ItemBasics item={item} categories={categories} />
        <GroupEditor initial={groups} templates={templates} />
        {item.id && (
          <DeleteButton
            name={item.nameEn}
            label="Delete item"
            warning="It also leaves any bundle it’s in. To take it off for now, switch “Listed on the menu” off instead."
            onDelete={() => deleteItem(item.id!)}
          />
        )}
      </div>
      <SaveBar
        dirty={dirty}
        pending={pending}
        state={state}
        isNew={!item.id}
        saveLabel={item.id ? "Save" : "Add to the menu"}
        onDiscard={() => {
          setVersion((v) => v + 1);
          settle();
        }}
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
    <div className="grid items-stretch gap-6 wide:grid-cols-[minmax(0,1fr)_320px]">
      <section className="card grid content-start gap-4 p-5 sm:grid-cols-2">
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
            rows={6}
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
            rows={6}
            maxLength={300}
            defaultValue={item.descriptionAr}
            lang="ar"
            dir="rtl"
            className="field"
          />
        </div>
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
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

      <div className="flex flex-col gap-6">
        <section className="card p-5">
          <PhotoUpload
            name="imagePath"
            path={item.imagePath}
            src={item.imageSrc}
            folder="items"
            label="Photo"
          />
        </section>
        <section className="card flex flex-col gap-3 p-5">
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
        </section>
      </div>
    </div>
  );
}

/** Deleting, apart from saving: a quiet button at the end of the page. */
export function DeleteButton({
  name,
  label,
  warning,
  onDelete,
}: {
  name: string;
  label: string;
  warning: string;
  onDelete: () => Promise<{ error: string | null }>;
}) {
  const [deleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-end">
      <button
        type="button"
        disabled={deleting}
        onClick={() => {
          if (confirm(`Delete ${name} for good? ${warning}`))
            startDeleting(async () => setError((await onDelete()).error));
        }}
        className="btn btn-ghost text-bad"
      >
        {deleting ? "Deleting…" : label}
      </button>
      {error && <p className="mt-1 text-[13px] text-bad">{error}</p>}
    </div>
  );
}
