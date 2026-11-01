"use client";

import { useState } from "react";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import { PriceInput } from "@/components/admin/price-input";
import { moveInList, SortControl, useDragSort } from "@/components/admin/sortable";
import { Switch } from "@/components/admin/switch";
import {
  type ChoiceDraft,
  type GroupDraft,
  groupFromTemplate,
  ruleLabel,
  type Template,
  type TemplateChoice,
} from "@/lib/item-groups";

/** Ids for React: the saved key, or a local one (only ever made in the browser) until saved. */
let nextId = 0;
const uid = (key: string | null = null) => key ?? `draft-${nextId++}`;

type Choice = ChoiceDraft & { uid: string };
type Group = Omit<GroupDraft, "choices"> & { uid: string; open: boolean; choices: Choice[] };

const toGroup = (draft: GroupDraft, open = false): Group => ({
  ...draft,
  uid: uid(draft.key),
  open,
  choices: draft.choices.map((c) => ({ ...c, uid: uid(c.key) })),
});

const CHANGED = "ring-1 ring-accent";

/** One choice per row from 1280px up, under a single row of column names. */
const choiceColumns =
  "grid grid-cols-2 gap-2 xl:grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_6.5rem_5.5rem_9rem_5.5rem] xl:items-center";

/** Whether a template choice on the item differs from the template. */
const choiceChanged = (c: Choice, source: TemplateChoice) =>
  c.nameEn !== source.nameEn ||
  c.nameAr !== source.nameAr ||
  c.price !== source.price ||
  !c.available;

/** How many things on the group differ from its template. */
function changeCount(group: Group, template: Template) {
  const fromTemplate = group.choices.filter((c) => c.optionId);
  const order = fromTemplate.map((c) => c.optionId).join();
  const usual = template.choices
    .filter((t) => fromTemplate.some((c) => c.optionId === t.id))
    .map((t) => t.id)
    .join();
  return (
    (group.nameEn !== template.nameEn || group.nameAr !== template.nameAr ? 1 : 0) +
    (group.min !== template.min || group.max !== template.max ? 1 : 0) +
    (order !== usual ? 1 : 0) +
    group.choices.filter((c) => {
      if (c.removed) return true;
      const source = template.choices.find((t) => t.id === c.optionId);
      return !source || choiceChanged(c, source);
    }).length
  );
}

function GroupCard({
  group,
  template,
  index,
  count,
  sort,
  onChange,
  onRemove,
}: {
  group: Group;
  template: Template | undefined;
  index: number;
  count: number;
  sort: ReturnType<typeof useDragSort>;
  onChange: (patch: Partial<Group>) => void;
  onRemove: () => void;
}) {
  const shown = group.choices.filter((c) => !c.removed);
  const removed = group.choices.filter((c) => c.removed);
  const sourceOf = (c: Choice) => template?.choices.find((t) => t.id === c.optionId);
  const changes = template ? changeCount(group, template) : 0;
  const required = group.min > 0;

  const updateChoice = (id: string, patch: Partial<Choice>) =>
    onChange({ choices: group.choices.map((c) => (c.uid === id ? { ...c, ...patch } : c)) });
  const choiceSort = useDragSort((from, to) =>
    onChange({ choices: [...moveInList(shown, from, to), ...removed] }),
  );
  const preselect = (choice: Choice, on: boolean) => {
    if (!choice.key) return;
    const key = choice.key;
    onChange({
      defaults: on
        ? group.max === 1
          ? [key]
          : [...group.defaults, key]
        : group.defaults.filter((d) => d !== key),
    });
  };
  const removeChoice = (choice: Choice) => {
    const defaults = group.defaults.filter((d) => d !== choice.key);
    onChange(
      choice.optionId
        ? {
            defaults,
            choices: group.choices.map((c) => (c.uid === choice.uid ? { ...c, removed: true } : c)),
          }
        : { defaults, choices: group.choices.filter((c) => c.uid !== choice.uid) },
    );
  };

  return (
    <li {...sort.row(index)} className="sort-row rounded-[12px] border border-line bg-surface">
      <div className="flex items-center gap-1 ps-2 pe-3">
        <SortControl sort={sort} index={index} count={count} label={group.nameEn || "this group"} />
        <button
          type="button"
          aria-expanded={group.open}
          onClick={() => onChange({ open: !group.open })}
          className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-start"
        >
          <Icon
            name="chevron"
            className={`size-4 text-muted transition-transform ${group.open ? "rotate-90" : ""}`}
          />
          <span className="font-semibold">{group.nameEn || "New group"}</span>
          <span className="text-[13px] text-muted">
            {ruleLabel(group)} · {shown.length} choice{shown.length === 1 ? "" : "s"}
          </span>
          <span className="ms-auto flex items-center gap-2">
            {changes > 0 && (
              <span className="pill bg-accent-soft text-accent">{changes} changed</span>
            )}
            <span className="text-[13px] text-muted">
              {template ? `${template.nameEn} template` : "Only on this item"}
            </span>
          </span>
        </button>
      </div>

      {group.open && (
        <div className="border-t border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] xl:items-end">
            <div>
              <label htmlFor={`${group.uid}-en`} className="label">
                Group name
              </label>
              <input
                id={`${group.uid}-en`}
                value={group.nameEn}
                onChange={(e) => onChange({ nameEn: e.target.value })}
                maxLength={80}
                className={`field ${template && group.nameEn !== template.nameEn ? CHANGED : ""}`}
              />
            </div>
            <div>
              <label htmlFor={`${group.uid}-ar`} className="label">
                Group name in Arabic
              </label>
              <input
                id={`${group.uid}-ar`}
                value={group.nameAr}
                onChange={(e) => onChange({ nameAr: e.target.value })}
                maxLength={80}
                lang="ar"
                dir="rtl"
                className={`field ${template && group.nameAr !== template.nameAr ? CHANGED : ""}`}
              />
            </div>
            <div className="flex min-h-[38px] items-center gap-2">
              <Switch
                checked={required}
                onChange={(on) => onChange({ min: on ? 1 : 0 })}
                label="Required"
              />
              Required
            </div>
            {required && (
              <div>
                <label htmlFor={`${group.uid}-min`} className="label">
                  At least
                </label>
                <input
                  id={`${group.uid}-min`}
                  type="number"
                  min={1}
                  max={group.max}
                  value={group.min}
                  onChange={(e) =>
                    onChange({ min: Math.min(Math.max(1, Number(e.target.value) || 1), group.max) })
                  }
                  className={`field w-20 ${template && group.min !== template.min ? CHANGED : ""}`}
                />
              </div>
            )}
            <div>
              <label htmlFor={`${group.uid}-max`} className="label">
                At most
              </label>
              <input
                id={`${group.uid}-max`}
                type="number"
                min={1}
                max={20}
                value={group.max}
                onChange={(e) => {
                  const max = Math.min(Math.max(1, Number(e.target.value) || 1), 20);
                  onChange({ max, min: Math.min(group.min, max) });
                }}
                className={`field w-20 ${template && group.max !== template.max ? CHANGED : ""}`}
              />
            </div>
          </div>

          {shown.length > 0 && (
            <div
              className={`${choiceColumns} mt-5 hidden border-b border-line pb-2 text-[12px] font-semibold text-muted xl:grid`}
            >
              <span />
              <span>Choice</span>
              <span>In Arabic</span>
              <span>Extra</span>
              <span>Preselected</span>
              <span>Available</span>
              <span />
            </div>
          )}
          <ul className="flex flex-col divide-y divide-line">
            {shown.map((choice, i) => {
              const source = sourceOf(choice);
              const preselected = !!choice.key && group.defaults.includes(choice.key);
              return (
                <li
                  key={choice.uid}
                  {...choiceSort.row(i)}
                  className={`sort-row py-2 ${choiceColumns}`}
                >
                  <div className="col-span-2 xl:col-span-1">
                    <SortControl
                      sort={choiceSort}
                      index={i}
                      count={shown.length}
                      label={choice.nameEn || "this choice"}
                    />
                  </div>
                  <input
                    value={choice.nameEn}
                    onChange={(e) => updateChoice(choice.uid, { nameEn: e.target.value })}
                    maxLength={80}
                    aria-label="Choice"
                    placeholder="Choice"
                    className={`field ${source && choice.nameEn !== source.nameEn ? CHANGED : ""}`}
                  />
                  <input
                    value={choice.nameAr}
                    onChange={(e) => updateChoice(choice.uid, { nameAr: e.target.value })}
                    maxLength={80}
                    lang="ar"
                    dir="rtl"
                    aria-label="Choice in Arabic"
                    placeholder="بالعربي"
                    className={`field ${source && choice.nameAr !== source.nameAr ? CHANGED : ""}`}
                  />
                  <PriceInput
                    cents={choice.price}
                    onChange={(price) => updateChoice(choice.uid, { price })}
                    label={`Extra price for ${choice.nameEn}`}
                    className={source && choice.price !== source.price ? CHANGED : ""}
                  />
                  <label className="flex items-center gap-1.5 text-[13px]">
                    <input
                      type="checkbox"
                      checked={preselected}
                      disabled={
                        !preselected &&
                        (!choice.key || (group.max > 1 && group.defaults.length >= group.max))
                      }
                      onChange={(e) => preselect(choice, e.target.checked)}
                      aria-label={`Preselect ${choice.nameEn}`}
                      className="size-4 accent-accent"
                    />
                    <span className="xl:hidden">Preselected</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <Switch
                      checked={choice.available}
                      onChange={(available) => updateChoice(choice.uid, { available })}
                      label={`${choice.nameEn} available on this item`}
                    />
                    {source && !source.available ? (
                      <span className="leading-4 font-semibold text-bad">Sold out everywhere</span>
                    ) : (
                      <span>{choice.available ? "On" : "Off here"}</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 xl:col-span-1">
                    {source && choiceChanged(choice, source) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateChoice(choice.uid, {
                            nameEn: source.nameEn,
                            nameAr: source.nameAr,
                            price: source.price,
                            available: true,
                          })
                        }
                        className="btn btn-ghost btn-sm px-1.5"
                      >
                        Reset
                      </button>
                    )}
                    {!source && <span className="text-[12px] text-muted">Only here</span>}
                    <button
                      type="button"
                      aria-label={`Remove ${choice.nameEn}`}
                      onClick={() => removeChoice(choice)}
                      className="btn btn-ghost btn-sm px-1.5 text-bad"
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {removed.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px] text-muted">
              Removed from this item:
              {removed.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => updateChoice(c.uid, { removed: false })}
                  className="btn btn-ghost btn-sm"
                >
                  <Icon name="plus" className="size-3.5" />
                  {c.nameEn}
                </button>
              ))}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  choices: [
                    ...shown,
                    {
                      uid: uid(),
                      key: null,
                      optionId: null,
                      nameEn: "",
                      nameAr: "",
                      price: 0,
                      available: true,
                      removed: false,
                    },
                    ...removed,
                  ],
                })
              }
              className="btn btn-secondary btn-sm"
            >
              <Icon name="plus" className="size-4" />
              Add a choice
            </button>
            <span className="ms-auto flex gap-1">
              {template && changes > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Put ${group.nameEn} back to its template? Your changes here go.`))
                      onChange({
                        ...toGroup(groupFromTemplate(template, group.key), true),
                        uid: group.uid,
                        defaults: group.defaults.filter((d) =>
                          template.choices.some((t) => t.key === d),
                        ),
                      });
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Reset to template
                </button>
              )}
              <button type="button" onClick={onRemove} className="btn btn-ghost btn-sm text-bad">
                Remove group
              </button>
            </span>
          </div>
        </div>
      )}
    </li>
  );
}

/** An item's groups: each one fully editable, following its template until changed. */
export function GroupEditor({
  initial,
  templates,
}: {
  initial: GroupDraft[];
  templates: Template[];
}) {
  const [groups, setGroups] = useState<Group[]>(() => initial.map((g) => toGroup(g)));
  const sort = useDragSort((from, to) => setGroups((list) => moveInList(list, from, to)));

  const templateOf = (id: string | null) => templates.find((t) => t.id === id);
  const unused = templates.filter((t) => !groups.some((g) => g.templateId === t.id));
  const add = (value: string) => {
    const template = templateOf(value);
    setGroups((list) => [
      ...list,
      toGroup(
        template
          ? groupFromTemplate(template)
          : {
              key: null,
              templateId: null,
              nameEn: "",
              nameAr: "",
              min: 0,
              max: 1,
              defaults: [],
              choices: [],
            },
        true,
      ),
    ]);
  };
  return (
    <section className="card p-5">
      <input
        type="hidden"
        name="groups"
        value={JSON.stringify(groups, (key, value) =>
          key === "uid" || key === "open" ? undefined : value,
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">
          Choices & add-ons
          <Help>
            A group follows its template until you change something here: only what you change stops
            following, and shows outlined. Customers see the groups in this order.
          </Help>
        </h2>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) add(e.target.value);
          }}
          aria-label="Add a group"
          className="field w-auto"
        >
          <option value="">Add a group…</option>
          {unused.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nameEn} ({ruleLabel(t).toLowerCase()})
            </option>
          ))}
          <option value="blank">Blank group, only on this item</option>
        </select>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {groups.map((group, index) => (
          <GroupCard
            key={group.uid}
            group={group}
            template={templateOf(group.templateId)}
            index={index}
            count={groups.length}
            sort={sort}
            onChange={(patch) =>
              setGroups((list) => list.map((g, i) => (i === index ? { ...g, ...patch } : g)))
            }
            onRemove={() => setGroups((list) => list.filter((_, i) => i !== index))}
          />
        ))}
        {groups.length === 0 && <li className="text-muted">No groups yet.</li>}
      </ul>
    </section>
  );
}
