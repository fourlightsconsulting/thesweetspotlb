"use client";

import { useActionState, useState, useTransition } from "react";
import { FormStatus, idle, useSubmit } from "@/components/admin/form";
import { Icon } from "@/components/admin/icons";
import { Switch } from "@/components/admin/switch";
import { deleteCode, saveCode } from "./actions";

export type CodeValues = {
  id: string | null;
  code: string;
  description: string;
  kind: "percent" | "amount";
  /** Percent, or cents for an amount. */
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  firstOrderOnly: boolean;
  usageLimit: number | null;
  perCustomer: number | null;
  /** datetime-local values in Beirut time, or "". */
  startsAt: string;
  endsAt: string;
  active: boolean;
};

const blank: CodeValues = {
  id: null,
  code: "",
  description: "",
  kind: "percent",
  value: 10,
  minSubtotal: 0,
  maxDiscount: null,
  firstOrderOnly: false,
  usageLimit: null,
  perCustomer: 1,
  startsAt: "",
  endsAt: "",
  active: true,
};

const dollars = (cents: number | null) => (cents ? (cents / 100).toFixed(2) : "");

/** A discount code's editor (new when `code` is missing). */
export function CodeForm({ code = blank, onDone }: { code?: CodeValues; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveCode, idle);
  const submit = useSubmit(action);
  const [kind, setKind] = useState(code.kind);
  const [active, setActive] = useState(code.active);
  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState(0);
  if (state.status === "saved" && state.at !== lastAt) {
    setLastAt(state.at);
    if (!code.id) onDone?.();
  }
  const p = code.id ?? "new";

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {code.id && <input type="hidden" name="id" value={code.id} />}
      <div>
        <label htmlFor={`${p}-code`} className="label">
          Code
        </label>
        <input
          id={`${p}-code`}
          name="code"
          required
          pattern="[A-Za-z0-9]{3,24}"
          defaultValue={code.code}
          placeholder="SWEET20"
          className="field font-mono uppercase"
        />
      </div>
      <div>
        <label htmlFor={`${p}-desc`} className="label">
          Note <span className="font-normal text-muted">(for the team)</span>
        </label>
        <input
          id={`${p}-desc`}
          name="description"
          maxLength={200}
          defaultValue={code.description}
          placeholder="Instagram giveaway, October"
          className="field"
        />
      </div>
      <fieldset>
        <legend className="label">Takes off</legend>
        <div className="flex items-center gap-2">
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as CodeValues["kind"])}
            aria-label="Kind of discount"
            className="field w-auto"
          >
            <option value="percent">Percent</option>
            <option value="amount">Dollars</option>
          </select>
          <input
            name="value"
            type="number"
            required
            min={kind === "percent" ? 1 : 0.25}
            max={kind === "percent" ? 100 : undefined}
            step={kind === "percent" ? 1 : 0.25}
            defaultValue={code.kind === "percent" ? code.value : dollars(code.value)}
            aria-label={kind === "percent" ? "Percent off" : "Dollars off"}
            className="field w-28"
          />
          <span className="text-muted">{kind === "percent" ? "%" : "$"}</span>
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${p}-min`} className="label">
            From an order of ($)
          </label>
          <input
            id={`${p}-min`}
            name="minSubtotal"
            type="number"
            min={0}
            step={0.5}
            defaultValue={dollars(code.minSubtotal)}
            placeholder="Any"
            className="field"
          />
        </div>
        {kind === "percent" && (
          <div>
            <label htmlFor={`${p}-max`} className="label">
              At most ($)
            </label>
            <input
              id={`${p}-max`}
              name="maxDiscount"
              type="number"
              min={0}
              step={0.5}
              defaultValue={dollars(code.maxDiscount)}
              placeholder="No cap"
              className="field"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${p}-limit`} className="label">
            Uses in total
          </label>
          <input
            id={`${p}-limit`}
            name="usageLimit"
            type="number"
            min={1}
            defaultValue={code.usageLimit ?? ""}
            placeholder="No limit"
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${p}-per`} className="label">
            Uses per customer
          </label>
          <input
            id={`${p}-per`}
            name="perCustomer"
            type="number"
            min={1}
            defaultValue={code.perCustomer ?? ""}
            placeholder="No limit"
            className="field"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${p}-start`} className="label">
            Starts
          </label>
          <input
            id={`${p}-start`}
            name="startsAt"
            type="datetime-local"
            defaultValue={code.startsAt}
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${p}-end`} className="label">
            Ends
          </label>
          <input
            id={`${p}-end`}
            name="endsAt"
            type="datetime-local"
            defaultValue={code.endsAt}
            className="field"
          />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="firstOrderOnly"
            defaultChecked={code.firstOrderOnly}
            className="size-4 accent-accent"
          />
          First order only <span className="text-muted">(by phone number)</span>
        </label>
        <div className="flex items-center gap-3">
          <Switch checked={active} onChange={setActive} label="Code on" name="active" />
          <span>{active ? "On: customers can use it" : "Off"}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : code.id ? "Save" : "Create code"}
        </button>
        <FormStatus state={state} />
        {code.id && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm(`Delete ${code.code}?`))
                startDeleting(async () => setDeleteError((await deleteCode(code.id!)).error));
            }}
            className="btn btn-ghost ms-auto text-bad"
          >
            Delete
          </button>
        )}
        {deleteError && <p className="w-full text-[13px] text-bad">{deleteError}</p>}
      </div>
    </form>
  );
}

export function NewCode() {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <Icon name="plus" className="size-4" />
        New code
      </button>
    );
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">New code</h2>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
      <CodeForm
        key={round}
        onDone={() => {
          setRound((r) => r + 1);
          setOpen(false);
        }}
      />
    </section>
  );
}
