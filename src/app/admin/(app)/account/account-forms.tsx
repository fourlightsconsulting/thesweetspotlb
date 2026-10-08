"use client";

import { useActionState } from "react";
import { type AccountState, changePassword, rename } from "./actions";

function Feedback({ state, saved }: { state: AccountState; saved: string }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-[10px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
        {state.message}
      </p>
    );
  }
  if (state.status === "saved") {
    return (
      <p role="status" className="text-[13px] font-semibold text-good">
        {saved}
      </p>
    );
  }
  return null;
}

export function AccountForms({ name }: { name: string }) {
  const [nameState, renameAction, renaming] = useActionState<AccountState, FormData>(rename, {
    status: "idle",
  });
  const [passwordState, passwordAction, changing] = useActionState<AccountState, FormData>(
    changePassword,
    { status: "idle" },
  );

  return (
    <div className="grid max-w-[720px] gap-6 wide:grid-cols-2">
      <form action={renameAction} className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Name</h2>
        <div>
          <label htmlFor="account-name" className="label">
            Shown to the team
          </label>
          <input
            id="account-name"
            name="name"
            defaultValue={name}
            required
            maxLength={80}
            className="field"
          />
        </div>
        <Feedback state={nameState} saved="Saved." />
        <button className="btn btn-primary self-start" disabled={renaming}>
          {renaming ? "Saving…" : "Save"}
        </button>
      </form>

      <form action={passwordAction} className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Password</h2>
        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className="field"
          />
          <p className="hint">At least 10 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">
            Type it again
          </label>
          <input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className="field"
          />
        </div>
        <Feedback state={passwordState} saved="Password changed." />
        <button className="btn btn-primary self-start" disabled={changing}>
          {changing ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
