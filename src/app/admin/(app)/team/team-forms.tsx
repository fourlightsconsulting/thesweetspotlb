"use client";

import { useActionState, useState, useTransition } from "react";
import { addMember, resetPassword, type TeamState, updateMember } from "./actions";
import type { Member } from "./page";

const roleLabels = { staff: "Staff", manager: "Manager", owner: "Owner" } as const;

const lastSeen = (iso: string | null) =>
  iso
    ? `Last signed in ${new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))}`
    : "Hasn’t signed in yet";

/** A temporary password, shown once, with a copy button. */
function OneTimePassword({
  email,
  password,
  note,
}: {
  email: string;
  password: string;
  note: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[10px] bg-accent-soft p-3 text-[13px]">
      <p>{note}</p>
      <p className="mt-2 font-semibold">{email}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="rounded-md bg-surface px-2 py-1 font-mono text-sm select-all">
          {password}
        </code>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            void navigator.clipboard.writeText(password).then(() => setCopied(true));
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-muted">
        It won’t be shown again. They can change it under Your account.
      </p>
    </div>
  );
}

export function AddMember() {
  const [state, action, pending] = useActionState<TeamState, FormData>(addMember, {
    status: "idle",
  });

  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">Add someone</h2>
      <form action={action} className="mt-4 flex flex-col gap-3">
        <div>
          <label htmlFor="member-name" className="label">
            Name
          </label>
          <input id="member-name" name="name" required maxLength={80} className="field" />
        </div>
        <div>
          <label htmlFor="member-email" className="label">
            Email
          </label>
          <input id="member-email" name="email" type="email" required className="field" />
        </div>
        <div>
          <label htmlFor="member-role" className="label">
            Role
          </label>
          <select id="member-role" name="role" defaultValue="staff" className="field">
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {state.status === "error" && (
          <p role="alert" className="rounded-[10px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
            {state.message}
          </p>
        )}
        {state.status === "added" &&
          (state.password ? (
            <OneTimePassword
              email={state.email}
              password={state.password}
              note="Added. Send them this temporary password to sign in:"
            />
          ) : (
            <p className="rounded-[10px] bg-accent-soft p-3 text-[13px]">
              {state.email} already had an account, so they keep their password.
            </p>
          ))}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add to the team"}
        </button>
      </form>
    </section>
  );
}

export function MemberRow({ member, isMe }: { member: Member; isMe: boolean }) {
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reset, resetAction, resetting] = useActionState<TeamState, FormData>(resetPassword, {
    status: "idle",
  });

  const save = (change: Record<string, string>) => {
    const form = new FormData();
    form.set("userId", member.user_id);
    for (const [key, value] of Object.entries(change)) form.set(key, value);
    startSaving(async () => {
      const result = await updateMember(form);
      setError(result.error);
    });
  };

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {member.display_name}
            {isMe && <span className="pill ms-2">You</span>}
            {!member.is_active && <span className="pill ms-2 bg-bad-soft text-bad">No access</span>}
          </p>
          <p className="truncate text-[13px] text-muted">
            {member.email} · {lastSeen(member.last_sign_in_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={`Role for ${member.display_name}`}
            value={member.role}
            disabled={isMe || saving}
            onChange={(e) => save({ role: e.target.value })}
            className="field h-[30px] min-h-[30px] w-auto py-1 text-[13px]"
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {!isMe && (
            <>
              <form action={resetAction}>
                <input type="hidden" name="userId" value={member.user_id} />
                <button className="btn btn-secondary btn-sm" disabled={resetting}>
                  {resetting ? "Resetting…" : "Reset password"}
                </button>
              </form>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ active: String(!member.is_active) })}
                className={`btn btn-sm ${member.is_active ? "btn-danger" : "btn-secondary"}`}
              >
                {member.is_active ? "Remove access" : "Give access back"}
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      )}
      {reset.status === "error" && (
        <p role="alert" className="text-[13px] text-bad">
          {reset.message}
        </p>
      )}
      {reset.status === "reset" && (
        <OneTimePassword
          email={reset.email}
          password={reset.password}
          note="New temporary password. Their old one no longer works:"
        />
      )}
    </li>
  );
}
