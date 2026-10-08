"use client";

import { useActionState } from "react";
import { type SignInState, signIn } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { error: null });

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-[10px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary mt-1" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
