"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { type FormState, idle } from "@/components/admin/form";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import { PriceInput } from "@/components/admin/price-input";
import { SaveBar, useUnsavedGuard } from "@/components/admin/save-bar";
import { moveInList, SortControl, useDragSort } from "@/components/admin/sortable";
import { Switch } from "@/components/admin/switch";
import { DeleteButton } from "../../items/[id]/item-form";
import { deleteGroup, saveTemplate } from "../../actions";

export type TemplateValues = {
  id: string | null;
  nameEn: string;
  nameAr: string;
  min: number;
  max: number;
  choices: {
    id: string | null;
    nameEn: string;
    nameAr: string;
    price: number;
    available: boolean;
    /** Items with their own price for this choice. */
    ownPrices: number;
  }[];
};

const items = (count: number) => `${count} item${count === 1 ? "" : "s"}`;

const columns =
  "grid grid-cols-2 gap-2 sm:grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_6.5rem_9.5rem_2rem] sm:items-center";

/** Local ids for React keys; choices keep theirs once saved. */
let nextKey = 0;

/** A template's page: its rule and its whole list of choices, saved together. */
export function TemplateForm({
  template,
  usedBy,
}: {
  template: TemplateValues;
  usedBy: { id: string; name: string }[];
}) {
  // Out here so "Saved" outlives the fields starting over from what was saved.
  const [state, setState] = useState<FormState>(idle);
  const [pending, startSaving] = useTransition();
  return (
    <TemplateFields
      key={JSON.stringify(template)}
      template={template}
      usedBy={usedBy}
      state={state}
      setState={setState}
      pending={pending}
      save={(draft) => startSaving(async () => setState(await saveTemplate(draft)))}
    />
  );
}

function TemplateFields({
  template,
  usedBy,
  state,
  setState,
  pending,
  save,
}: {
  template: TemplateValues;
  usedBy: { id: string; name: string }[];
  state: FormState;
  setState: (state: FormState) => void;
  pending: boolean;
  save: (draft: unknown) => void;
}) {
  const start = () => ({
    ...template,
    choices: template.choices.map((c) => ({ ...c, key: c.id ?? `new-${nextKey++}` })),
  });
  const [baseline] = useState(start);
  const [draft, setDraft] = useState(baseline);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useUnsavedGuard(dirty);

  const required = draft.min > 0;
  const hasNew = draft.choices.some((c) => !c.id);
  const change = (patch: Partial<typeof draft>) => {
    setState(idle);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const updateChoice = (key: string, patch: Partial<(typeof draft.choices)[number]>) =>
    change({ choices: draft.choices.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  const sort = useDragSort((from, to) => change({ choices: moveInList(draft.choices, from, to) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(draft);
      }}
    >
      <div className="grid items-start gap-6 wide:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label htmlFor="template-en" className="label">
                Name
              </label>
              <input
                id="template-en"
                value={draft.nameEn}
                onChange={(e) => change({ nameEn: e.target.value })}
                maxLength={80}
                placeholder="Extra toppings"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="template-ar" className="label">
                Name in Arabic
              </label>
              <input
                id="template-ar"
                value={draft.nameAr}
                onChange={(e) => change({ nameAr: e.target.value })}
                maxLength={80}
                lang="ar"
                dir="rtl"
                className="field"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
              <div className="flex min-h-[38px] items-center gap-2">
                <Switch
                  checked={required}
                  onChange={(on) => change({ min: on ? 1 : 0 })}
                  label="Required"
                />
                Required
              </div>
              {required && (
                <div>
                  <label htmlFor="template-min" className="label">
                    At least
                  </label>
                  <input
                    id="template-min"
                    type="number"
                    min={1}
                    max={draft.max}
                    value={draft.min}
                    onChange={(e) =>
                      change({
                        min: Math.min(Math.max(1, Number(e.target.value) || 1), draft.max),
                      })
                    }
                    className="field w-20"
                  />
                </div>
              )}
              <div>
                <label htmlFor="template-max" className="label">
                  At most
                </label>
                <input
                  id="template-max"
                  type="number"
                  min={1}
                  max={20}
                  value={draft.max}
                  onChange={(e) => {
                    const max = Math.min(Math.max(1, Number(e.target.value) || 1), 20);
                    change({ max, min: Math.min(draft.min, max) });
                  }}
                  className="field w-20"
                />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-bold">
              Choices
              <Help>
                Available switches a choice on or off for every item that has it. An item can also
                switch it off just for itself.
              </Help>
            </h2>
            {draft.choices.length > 0 && (
              <div
                className={`${columns} mt-4 hidden border-b border-line pb-2 text-[12px] font-semibold text-muted sm:grid`}
              >
                <span />
                <span>Choice</span>
                <span>In Arabic</span>
                <span>Extra</span>
                <span>Available</span>
                <span />
              </div>
            )}
            <ul className="flex flex-col divide-y divide-line">
              {draft.choices.map((choice, index) => (
                <li key={choice.key} {...sort.row(index)} className="sort-row py-2">
                  <div className={columns}>
                    <div className="col-span-2 sm:col-span-1">
                      <SortControl
                        sort={sort}
                        index={index}
                        count={draft.choices.length}
                        label={choice.nameEn || "this choice"}
                      />
                    </div>
                    <input
                      value={choice.nameEn}
                      onChange={(e) => updateChoice(choice.key, { nameEn: e.target.value })}
                      maxLength={80}
                      aria-label="Choice"
                      placeholder="Choice"
                      className="field"
                    />
                    <input
                      value={choice.nameAr}
                      onChange={(e) => updateChoice(choice.key, { nameAr: e.target.value })}
                      maxLength={80}
                      lang="ar"
                      dir="rtl"
                      aria-label="Choice in Arabic"
                      placeholder="بالعربي"
                      className="field"
                    />
                    <PriceInput
                      cents={choice.price}
                      onChange={(price) => updateChoice(choice.key, { price })}
                      label={`Extra price for ${choice.nameEn}`}
                    />
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <Switch
                        checked={choice.available}
                        onChange={(available) => updateChoice(choice.key, { available })}
                        label={`${choice.nameEn} available`}
                      />
                      <span className={choice.available ? "" : "font-semibold text-bad"}>
                        {choice.available ? "On" : "Sold out"}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${choice.nameEn}`}
                      onClick={() => {
                        const leaves =
                          choice.id && usedBy.length > 0
                            ? ` It also leaves ${items(usedBy.length)} when you save.`
                            : "";
                        if (!leaves || confirm(`Delete ${choice.nameEn}?${leaves}`))
                          change({ choices: draft.choices.filter((c) => c.key !== choice.key) });
                      }}
                      className="btn btn-ghost btn-sm justify-self-end px-1.5 text-bad"
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                  {choice.ownPrices > 0 && (
                    <p className="mt-1 text-[13px] text-muted sm:ps-9">
                      Own price on {items(choice.ownPrices)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                change({
                  choices: [
                    ...draft.choices,
                    {
                      key: `new-${nextKey++}`,
                      id: null,
                      nameEn: "",
                      nameAr: "",
                      price: 0,
                      available: true,
                      ownPrices: 0,
                    },
                  ],
                })
              }
              className="btn btn-secondary btn-sm mt-3"
            >
              <Icon name="plus" className="size-4" />
              Add a choice
            </button>
            {hasNew && usedBy.length > 0 && (
              <p
                role="note"
                className="mt-3 rounded-[10px] bg-accent-soft px-3 py-2 text-[13px] leading-5"
              >
                <span className="font-semibold">
                  New choices will be added to {items(usedBy.length)}:
                </span>{" "}
                {usedBy.map((item) => item.name).join(", ")}
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {template.id && (
            <section className="card p-5">
              <h2 className="label mb-2">
                {usedBy.length === 0 ? "Not on any item yet" : `On ${items(usedBy.length)}`}
              </h2>
              {usedBy.length > 0 && (
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto text-[13px]">
                  {usedBy.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/menu/items/${item.id}`}
                        className="text-accent hover:underline"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {template.id && (
            <DeleteButton
              name={template.nameEn}
              label="Delete template"
              warning={usedBy.length > 0 ? "Items using it keep it as their own." : ""}
              onDelete={() => deleteGroup(template.id!)}
            />
          )}
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        state={state}
        isNew={!template.id}
        saveLabel={template.id ? "Save" : "Add template"}
        onDiscard={() => {
          setDraft(baseline);
          setState(idle);
        }}
      />
    </form>
  );
}
