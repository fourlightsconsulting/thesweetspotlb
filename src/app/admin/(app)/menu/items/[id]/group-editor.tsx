"use client";

import { useState } from "react";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import { Switch } from "@/components/admin/switch";
import {
  type ChoiceDraft,
  type GroupDraft,
  groupFromTemplate,
  type Template,
  type TemplateChoice,
} from "@/lib/item-groups";

export const ruleLabel = (g: { min: number; max: number }) =>
  g.min > 0
    ? g.max === 1
      ? "Required · pick one"
      : g.min === g.max
        ? `Required · pick ${g.min}`
        : `Required · pick ${g.min}–${g.max}`
    : g.max === 1
      ? "Optional · up to one"
      : `Optional · up to ${g.max}`;

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

/** A dollar amount that can be typed freely and still follows a reset from outside. */
function PriceInput({
  cents,
  onChange,
  label,
  changed,
}: {
  cents: number;
  onChange: (cents: number) => void;
  label: string;
  changed: boolean;
}) {
  const [text, setText] = useState((cents / 100).toFixed(2));
  const parsed = Math.round(Number(text) * 100) || 0;
  if (parsed !== cents) setText((cents / 100).toFixed(2));
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
        +$
      </span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(Math.max(0, Math.round(Number(e.target.value) * 100) || 0));
        }}
        aria-label={label}
        className={`field ps-8 ${changed ? CHANGED : ""}`}
      />
    </div>
  );
}

/** Whether a template choice on the item differs from the template. */
const choiceChanged = (c: Choice, source: TemplateChoice) =>
  c.nameEn !== source.nameEn ||
  c.nameAr !== source.nameAr ||
  c.price !== source.price ||
  !c.available;

function ChoiceRow({
  choice,
  source,
  preselected,
  preselectDisabled,
  first,
  last,
  onChange,
  onPreselect,
  onMove,
  onRemove,
}: {
  choice: Choice;
  source: TemplateChoice | undefined;
  preselected: boolean;
  preselectDisabled: boolean;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<Choice>) => void;
  onPreselect: (on: boolean) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <li className="py-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_6.5rem_11.5rem_10rem] sm:items-center">
        <input
          value={choice.nameEn}
          onChange={(e) => onChange({ nameEn: e.target.value })}
          maxLength={80}
          aria-label="Name"
          className={`field ${source && choice.nameEn !== source.nameEn ? CHANGED : ""}`}
        />
        <input
          value={choice.nameAr}
          onChange={(e) => onChange({ nameAr: e.target.value })}
          maxLength={80}
          lang="ar"
          dir="rtl"
          aria-label="Name in Arabic"
          className={`field ${source && choice.nameAr !== source.nameAr ? CHANGED : ""}`}
        />
        <PriceInput
          cents={choice.price}
          onChange={(price) => onChange({ price })}
          label={`Extra price for ${choice.nameEn}`}
          changed={!!source && choice.price !== source.price}
        />
        <label className="flex items-center gap-1.5 text-[13px]">
          <input
            type="checkbox"
            checked={preselected}
            disabled={preselectDisabled && !preselected}
            onChange={(e) => onPreselect(e.target.checked)}
            className="size-4 accent-accent"
          />
          Preselected
        </label>
        <div className="flex items-center gap-1.5 text-[13px]">
          <Switch
            checked={choice.available}
            onChange={(available) => onChange({ available })}
            label={`${choice.nameEn} available on this item`}
          />
          {source && !source.available ? (
            <span className="font-semibold text-bad">Sold out everywhere</span>
          ) : (
            <span>Available</span>
          )}
        </div>
        <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
          <button
            type="button"
            aria-label="Move up"
            disabled={first}
            onClick={() => onMove(-1)}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="up" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last}
            onClick={() => onMove(1)}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="down" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${choice.nameEn}`}
            onClick={onRemove}
            className="btn btn-ghost btn-sm px-1.5 text-bad"
          >
            <Icon name="trash" className="size-4" />
          </button>
          {source && choiceChanged(choice, source) && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  nameEn: source.nameEn,
                  nameAr: source.nameAr,
                  price: source.price,
                  available: true,
                })
              }
              className="btn btn-ghost btn-sm"
            >
              Reset
            </button>
          )}
          {!source && <span className="ms-1 text-[12px] text-muted">Only here</span>}
        </div>
      </div>
    </li>
  );
}

function GroupCard({
  group,
  template,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  group: Group;
  template: Template | undefined;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<Group>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const shown = group.choices.filter((c) => !c.removed);
  const removed = group.choices.filter((c) => c.removed);
  const sourceOf = (c: Choice) => template?.choices.find((t) => t.id === c.optionId);
  const required = group.min > 0;

  const updateChoice = (id: string, patch: Partial<Choice>) =>
    onChange({ choices: group.choices.map((c) => (c.uid === id ? { ...c, ...patch } : c)) });
  const moveChoice = (id: string, by: -1 | 1) => {
    const order = shown.map((c) => c.uid);
    const from = order.indexOf(id);
    [order[from], order[from + by]] = [order[from + by], order[from]];
    onChange({
      choices: [...order.map((u) => shown.find((c) => c.uid === u)!), ...removed],
    });
  };
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
    if (choice.optionId) {
      onChange({
        defaults,
        choices: group.choices.map((c) => (c.uid === choice.uid ? { ...c, removed: true } : c)),
      });
    } else {
      onChange({ defaults, choices: group.choices.filter((c) => c.uid !== choice.uid) });
    }
  };
  const setMax = (max: number) => onChange({ max, min: Math.min(group.min, max) });

  const nameChanged = template && group.nameEn !== template.nameEn;
  const nameArChanged = template && group.nameAr !== template.nameAr;
  const ruleChanged = template && (group.min !== template.min || group.max !== template.max);
  const usualOrder = template?.choices.map((t) => t.id).join();
  const orderChanged =
    template &&
    group.choices
      .filter((c) => c.optionId)
      .map((c) => c.optionId)
      .join() !== usualOrder;
  const changes =
    (nameChanged || nameArChanged ? 1 : 0) +
    (ruleChanged ? 1 : 0) +
    (orderChanged ? 1 : 0) +
    removed.length +
    group.choices.filter((c) => {
      const source = sourceOf(c);
      return !c.removed && (!source || choiceChanged(c, source));
    }).length;

  return (
    <li className="rounded-[12px] border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">{group.nameEn || "New group"}</span>{" "}
          <span className="text-[13px] text-muted">
            {ruleLabel(group)} · {shown.length} choice{shown.length === 1 ? "" : "s"}
            {template ? ` · ${template.nameEn} template` : " · only on this item"}
            {template && changes > 0 ? ` · ${changes} changed` : ""}
          </span>
        </p>
        <div className="flex">
          <button
            type="button"
            aria-label="Move up"
            disabled={first}
            onClick={() => onMove(-1)}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="up" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last}
            onClick={() => onMove(1)}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="down" className="size-4" />
          </button>
          <button type="button" onClick={onRemove} className="btn btn-ghost btn-sm text-bad">
            Remove
          </button>
        </div>
      </div>

      <details open={group.open}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            onChange({ open: !group.open });
          }}
          className="mt-1 cursor-pointer text-[13px] font-semibold text-accent"
        >
          Edit
        </summary>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
          <div>
            <label htmlFor={`${group.uid}-en`} className="label">
              Name
            </label>
            <input
              id={`${group.uid}-en`}
              value={group.nameEn}
              onChange={(e) => onChange({ nameEn: e.target.value })}
              maxLength={80}
              className={`field ${nameChanged ? CHANGED : ""}`}
            />
          </div>
          <div>
            <label htmlFor={`${group.uid}-ar`} className="label">
              Name in Arabic
            </label>
            <input
              id={`${group.uid}-ar`}
              value={group.nameAr}
              onChange={(e) => onChange({ nameAr: e.target.value })}
              maxLength={80}
              lang="ar"
              dir="rtl"
              className={`field ${nameArChanged ? CHANGED : ""}`}
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
              onChange={(e) => setMax(Math.min(Math.max(1, Number(e.target.value) || 1), 20))}
              className={`field w-20 ${template && group.max !== template.max ? CHANGED : ""}`}
            />
          </div>
        </div>

        <ul className="mt-3 flex flex-col divide-y divide-line">
          {shown.map((choice, i) => (
            <ChoiceRow
              key={choice.uid}
              choice={choice}
              source={sourceOf(choice)}
              preselected={!!choice.key && group.defaults.includes(choice.key)}
              preselectDisabled={
                !choice.key || (group.max > 1 && group.defaults.length >= group.max)
              }
              first={i === 0}
              last={i === shown.length - 1}
              onChange={(patch) => updateChoice(choice.uid, patch)}
              onPreselect={(on) => preselect(choice, on)}
              onMove={(by) => moveChoice(choice.uid, by)}
              onRemove={() => removeChoice(choice)}
            />
          ))}
        </ul>

        {removed.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            Removed:
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
                  ...group.choices,
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
                ],
              })
            }
            className="btn btn-secondary btn-sm"
          >
            <Icon name="plus" className="size-4" />
            Add a choice
          </button>
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
        </div>
      </details>
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
  const [adding, setAdding] = useState("");

  const templateOf = (id: string | null) => templates.find((t) => t.id === id);
  const unused = templates.filter((t) => !groups.some((g) => g.templateId === t.id));
  const move = (index: number, by: -1 | 1) =>
    setGroups((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  return (
    <section className="card p-5">
      <input type="hidden" name="groups" value={JSON.stringify(groups)} />
      <h2 className="text-base font-bold">
        Choices & add-ons
        <Help>
          A group follows its template until you change something here: only what you change stops
          following, and shows outlined. Shown to the customer in this order.
        </Help>
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {groups.map((group, index) => (
          <GroupCard
            key={group.uid}
            group={group}
            template={templateOf(group.templateId)}
            first={index === 0}
            last={index === groups.length - 1}
            onChange={(patch) =>
              setGroups((list) => list.map((g, i) => (i === index ? { ...g, ...patch } : g)))
            }
            onMove={(by) => move(index, by)}
            onRemove={() => setGroups((list) => list.filter((_, i) => i !== index))}
          />
        ))}
        {groups.length === 0 && <li className="text-muted">No choices</li>}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          aria-label="Group to add"
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
        <button
          type="button"
          disabled={!adding}
          onClick={() => {
            const template = templateOf(adding);
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
            setAdding("");
          }}
          className="btn btn-secondary"
        >
          Add
        </button>
      </div>
    </section>
  );
}
