"use client";

import { useEffect, useState, useTransition } from "react";

// Shared bits for admin forms that save through server actions.

export type FormState =
  { status: "idle" } | { status: "saved"; at: number } | { status: "error"; message: string };

export const idle: FormState = { status: "idle" };

/** "Saved" for a few seconds after a save, or the error until the next try. */
export function FormStatus({ state }: { state: FormState }) {
  const [shownAt, setShownAt] = useState(0);
  const savedAt = state.status === "saved" ? state.at : 0;

  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setShownAt(savedAt), 2500);
    return () => clearTimeout(timer);
  }, [savedAt]);

  if (state.status === "error")
    return (
      <p role="alert" className="text-[13px] text-bad">
        {state.message}
      </p>
    );
  if (state.status === "saved" && shownAt !== state.at)
    return (
      <p role="status" className="text-[13px] font-semibold text-good">
        Saved
      </p>
    );
  return null;
}

/**
 * Submits a form to a useActionState action without React's automatic form
 * reset, so a failed save keeps what was typed.
 */
export function useSubmit(action: (form: FormData) => void) {
  const [, startTransition] = useTransition();
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  };
}

/** A card with a title, a short explanation and its own save button. */
export function FormCard({
  title,
  description,
  children,
  action,
  pending,
  state,
  submitLabel = "Save",
  className = "",
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  action: (form: FormData) => void;
  pending: boolean;
  state: FormState;
  submitLabel?: string;
  className?: string;
}) {
  const submit = useSubmit(action);
  return (
    <form onSubmit={submit} className={`card p-5 ${className}`}>
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="mt-1 text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
