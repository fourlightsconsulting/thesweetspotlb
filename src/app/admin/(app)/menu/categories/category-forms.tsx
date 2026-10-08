"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { FormStatus, idle, useSubmit } from "@/components/admin/form";
import { Icon } from "@/components/admin/icons";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { Switch } from "@/components/admin/switch";
import { deleteCategory, moveCategory, saveCategory } from "../actions";
import type { AdminCategory } from "../data";

type Parent = { id: string; nameEn: string };

function CategoryFields({
  category,
  parents,
}: {
  category: AdminCategory | null;
  parents: Parent[];
}) {
  const [active, setActive] = useState(category?.active ?? true);
  const prefix = category?.id ?? "new";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div>
        <label htmlFor={`${prefix}-en`} className="label">
          Name
        </label>
        <input
          id={`${prefix}-en`}
          name="nameEn"
          required
          maxLength={80}
          defaultValue={category?.nameEn}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-ar`} className="label">
          Name in Arabic
        </label>
        <input
          id={`${prefix}-ar`}
          name="nameAr"
          required
          maxLength={80}
          defaultValue={category?.nameAr}
          lang="ar"
          dir="rtl"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-den`} className="label">
          Description
        </label>
        <input
          id={`${prefix}-den`}
          name="descriptionEn"
          maxLength={200}
          defaultValue={category?.descriptionEn}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-dar`} className="label">
          Description in Arabic
        </label>
        <input
          id={`${prefix}-dar`}
          name="descriptionAr"
          maxLength={200}
          defaultValue={category?.descriptionAr}
          lang="ar"
          dir="rtl"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-parent`} className="label">
          Sits under
        </label>
        <select
          id={`${prefix}-parent`}
          name="parentId"
          defaultValue={category?.parentId ?? ""}
          className="field"
        >
          <option value="">Nothing: it’s a menu tab</option>
          {parents
            .filter((p) => p.id !== category?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn} (as a heading)
              </option>
            ))}
        </select>
      </div>
      {category && (
        <div className="flex items-center gap-3 self-end pb-2">
          <Switch checked={active} onChange={setActive} label="Listed" name="active" />
          <span>Listed on the menu</span>
        </div>
      )}
      <div className="sm:col-span-2">
        <PhotoUpload
          name="imagePath"
          path={category?.imagePath ?? null}
          src={category?.imageSrc ?? null}
          folder="categories"
          label="Photo"
        />
        <p className="hint">Without one, the menu uses its first item’s photo.</p>
      </div>
    </div>
  );
}

export function CategoryRow({
  category,
  parents,
  itemCount,
  first,
  last,
}: {
  category: AdminCategory;
  parents: Parent[];
  itemCount: number;
  first: boolean;
  last: boolean;
}) {
  const [state, action, pending] = useActionState(saveCategory, idle);
  const submit = useSubmit(action);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (task: () => Promise<{ error: string | null }>) =>
    startBusy(async () => setError((await task()).error));

  return (
    <li className={category.parentId ? "ps-6" : ""}>
      <details className="group card">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <div className="relative size-10 flex-none overflow-hidden rounded-[10px] bg-cotton-candy">
            {category.imageSrc && (
              <Image src={category.imageSrc} alt="" fill sizes="40px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {category.nameEn}
              {!category.active && <span className="pill ms-2 bg-bad-soft text-bad">Hidden</span>}
            </p>
            <p className="text-[13px] text-muted">
              {category.parentId ? "Heading · " : ""}
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-none" onClick={(e) => e.preventDefault()}>
            <button
              type="button"
              aria-label={`Move ${category.nameEn} up`}
              disabled={first || busy}
              onClick={() => run(() => moveCategory(category.id, "up"))}
              className="btn btn-ghost btn-sm px-1.5"
            >
              <Icon name="up" className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Move ${category.nameEn} down`}
              disabled={last || busy}
              onClick={() => run(() => moveCategory(category.id, "down"))}
              className="btn btn-ghost btn-sm px-1.5"
            >
              <Icon name="down" className="size-4" />
            </button>
          </div>
          <Icon
            name="chevron"
            className="size-4 text-muted transition-transform group-open:rotate-90"
          />
        </summary>
        <form onSubmit={submit} className="border-t border-line p-4">
          <CategoryFields category={category} parents={parents} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <FormStatus state={state} />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm(`Delete ${category.nameEn}?`)) run(() => deleteCategory(category.id));
              }}
              className="btn btn-ghost ms-auto text-bad"
            >
              Delete
            </button>
          </div>
        </form>
      </details>
      {error && <p className="mt-1 text-[13px] text-bad">{error}</p>}
    </li>
  );
}

export function NewCategory({ parents }: { parents: Parent[] }) {
  const [state, action, pending] = useActionState(saveCategory, idle);
  const submit = useSubmit(action);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [lastAt, setLastAt] = useState(0);
  if (state.status === "saved" && state.at !== lastAt) {
    setLastAt(state.at);
    setFormKey((k) => k + 1);
    setOpen(false);
  }

  if (!open)
    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
          <Icon name="plus" className="size-4" />
          Add a category
        </button>
        <FormStatus state={state} />
      </div>
    );
  return (
    <form key={formKey} onSubmit={submit} className="card p-5">
      <h2 className="mb-4 text-base font-bold">New category</h2>
      <CategoryFields category={null} parents={parents} />
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add category"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
          Cancel
        </button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
