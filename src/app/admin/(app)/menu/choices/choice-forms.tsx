"use client";

import { useActionState, useState, useTransition } from "react";
import { Help } from "@/components/admin/help";
import { FormStatus, idle, useSubmit } from "@/components/admin/form";
import { Icon } from "@/components/admin/icons";
import { deleteChoice, deleteGroup, moveChoice, saveChoice, saveGroup } from "../actions";
import { ruleLabel } from "../items/[id]/group-editor";

export type Choice = {
  id: string;
  nameEn: string;
  nameAr: string;
  price: number;
  available: boolean;
  /** Items with their own price for this choice. */
  ownPrices: number;
};

export type Group = {
  id: string;
  nameEn: string;
  nameAr: string;
  min: number;
  max: number;
  usedBy: string[];
  choices: Choice[];
};

const items = (count: number) => `${count} item${count === 1 ? "" : "s"}`;

function GroupFields({ group }: { group: Group | null }) {
  const prefix = group?.id ?? "new";
  const [required, setRequired] = useState((group?.min ?? 0) > 0);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
      {group && <input type="hidden" name="id" value={group.id} />}
      <div>
        <label htmlFor={`${prefix}-gen`} className="label">
          Name
        </label>
        <input
          id={`${prefix}-gen`}
          name="nameEn"
          required
          maxLength={80}
          defaultValue={group?.nameEn}
          placeholder="Extra toppings"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-gar`} className="label">
          Name in Arabic
        </label>
        <input
          id={`${prefix}-gar`}
          name="nameAr"
          required
          maxLength={80}
          defaultValue={group?.nameAr}
          lang="ar"
          dir="rtl"
          className="field"
        />
      </div>
      <label className="flex min-h-[38px] items-center gap-2">
        <input
          type="checkbox"
          name="required"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="size-4 accent-accent"
        />
        Required
      </label>
      {required && (
        <div>
          <label htmlFor={`${prefix}-min`} className="label">
            At least
          </label>
          <input
            id={`${prefix}-min`}
            name="min"
            type="number"
            min={1}
            max={20}
            defaultValue={Math.max(group?.min ?? 1, 1)}
            className="field w-20"
          />
        </div>
      )}
      <div>
        <label htmlFor={`${prefix}-max`} className="label">
          At most
        </label>
        <input
          id={`${prefix}-max`}
          name="max"
          type="number"
          min={1}
          max={20}
          defaultValue={group?.max ?? 1}
          className="field w-20"
        />
      </div>
    </div>
  );
}

function ChoiceRow({
  choice,
  groupId,
  usedBy,
  first,
  last,
}: {
  choice: Choice;
  groupId: string;
  usedBy: number;
  first: boolean;
  last: boolean;
}) {
  const [state, action, pending] = useActionState(saveChoice, idle);
  const submit = useSubmit(action);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (task: () => Promise<{ error: string | null }>) =>
    startBusy(async () => setError((await task()).error));

  return (
    <li className="py-2">
      <form
        onSubmit={submit}
        className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_6rem_auto_auto] sm:items-center"
      >
        <input type="hidden" name="id" value={choice.id} />
        <input type="hidden" name="groupId" value={groupId} />
        <input
          name="nameEn"
          required
          maxLength={80}
          defaultValue={choice.nameEn}
          aria-label="Name"
          className="field"
        />
        <input
          name="nameAr"
          required
          maxLength={80}
          defaultValue={choice.nameAr}
          lang="ar"
          dir="rtl"
          aria-label="Name in Arabic"
          className="field"
        />
        <div className="relative">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
            +$
          </span>
          <input
            name="price"
            type="number"
            min={0}
            step={0.01}
            defaultValue={(choice.price / 100).toFixed(2)}
            aria-label="Extra price in dollars"
            className="field ps-8"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            name="available"
            defaultChecked={choice.available}
            className="size-4 accent-accent"
          />
          Available
        </label>
        <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
          <button className="btn btn-secondary btn-sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            aria-label="Move up"
            disabled={first || busy}
            onClick={() => run(() => moveChoice(choice.id, "up"))}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="up" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last || busy}
            onClick={() => run(() => moveChoice(choice.id, "down"))}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="down" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${choice.nameEn}`}
            disabled={busy}
            onClick={() => {
              const also = usedBy > 0 ? ` It also leaves ${items(usedBy)}.` : "";
              if (confirm(`Delete ${choice.nameEn}?${also}`)) run(() => deleteChoice(choice.id));
            }}
            className="btn btn-ghost btn-sm px-1.5 text-bad"
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      </form>
      {choice.ownPrices > 0 && (
        <p className="mt-1 text-[13px] text-muted">Own price on {items(choice.ownPrices)}</p>
      )}
      <FormStatus state={state} />
      {error && <p className="text-[13px] text-bad">{error}</p>}
    </li>
  );
}

function NewChoice({ groupId, usedBy }: { groupId: string; usedBy: string[] }) {
  const [state, action, pending] = useActionState(saveChoice, idle);
  const submit = useSubmit(action);
  const [formKey, setFormKey] = useState(0);
  const [lastAt, setLastAt] = useState(0);
  const [typing, setTyping] = useState(false);
  if (state.status === "saved" && state.at !== lastAt) {
    setLastAt(state.at);
    setFormKey((k) => k + 1);
    setTyping(false);
  }
  return (
    <form
      key={formKey}
      onSubmit={submit}
      className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-center"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input
        name="nameEn"
        required
        maxLength={80}
        placeholder="New choice"
        aria-label="New choice"
        onChange={(e) => setTyping(e.target.value.trim() !== "")}
        className="field"
      />
      <input
        name="nameAr"
        required
        maxLength={80}
        placeholder="بالعربي"
        lang="ar"
        dir="rtl"
        aria-label="New choice in Arabic"
        className="field"
      />
      <input
        name="price"
        type="number"
        min={0}
        step={0.01}
        placeholder="0.00"
        aria-label="Extra price in dollars"
        className="field"
      />
      <button className="btn btn-secondary" disabled={pending}>
        <Icon name="plus" className="size-4" />
        {pending ? "Adding…" : "Add"}
      </button>
      {typing && usedBy.length > 0 && (
        <p role="note" className="col-span-2 text-[13px] text-muted sm:col-span-4">
          <span className="font-semibold text-ink">
            This will be added to {items(usedBy.length)}:
          </span>{" "}
          {usedBy.join(", ")}
        </p>
      )}
      <div className="col-span-2 sm:col-span-4">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function GroupCard({ group }: { group: Group }) {
  const [state, action, pending] = useActionState(saveGroup, idle);
  const submit = useSubmit(action);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section id={`group-${group.id}`} className="card scroll-mt-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">{group.nameEn}</h2>
          <p className="text-[13px] text-muted">
            {ruleLabel(group)} ·{" "}
            {group.usedBy.length === 0 ? "not on any item yet" : `on ${items(group.usedBy.length)}`}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const also = group.usedBy.length > 0 ? " Items using it keep it as their own." : "";
            if (confirm(`Delete the ${group.nameEn} template?${also}`))
              startBusy(async () => setError((await deleteGroup(group.id)).error));
          }}
          className="btn btn-ghost btn-sm text-bad"
        >
          Delete template
        </button>
      </div>
      {group.usedBy.length > 0 && (
        <p className="mt-1 line-clamp-2 text-[13px] text-muted">{group.usedBy.join(", ")}</p>
      )}
      {error && <p className="mt-1 text-[13px] text-bad">{error}</p>}

      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-accent">
          Name and rule
        </summary>
        <form onSubmit={submit} className="mt-3">
          <GroupFields group={group} />
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-secondary btn-sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <FormStatus state={state} />
          </div>
        </form>
      </details>

      <div className="mt-3 hidden grid-cols-[1fr_1fr_6rem_auto_auto] gap-2 text-[12px] font-semibold text-muted sm:grid">
        <span>Choice</span>
        <span>Arabic</span>
        <span>Extra</span>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {group.choices.map((choice, i) => (
          <ChoiceRow
            key={`${choice.id}:${choice.nameEn}:${choice.price}:${choice.available}`}
            choice={choice}
            groupId={group.id}
            usedBy={group.usedBy.length}
            first={i === 0}
            last={i === group.choices.length - 1}
          />
        ))}
      </ul>
      <NewChoice groupId={group.id} usedBy={group.usedBy} />
    </section>
  );
}

export function NewGroup() {
  const [state, action, pending] = useActionState(saveGroup, idle);
  const submit = useSubmit(action);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <Icon name="plus" className="size-4" />
        Add a template
      </button>
    );
  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="mb-4 text-base font-bold">
        New template
        <Help>
          Required, at most 1 is a must-pick (a sauce); optional, at most 5 lets people add several
          (toppings).
        </Help>
      </h2>
      <GroupFields group={null} />
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add template"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
          Cancel
        </button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
