"use server";

import { redirect } from "next/navigation";
import { publishableKey, supabaseUrl } from "@/lib/supabase/env";
import { adminClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

/** Only admin paths, so a crafted link can't send someone elsewhere after signing in. */
const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "";
  return /^\/admin(\/[a-z0-9/_-]*)?$/.test(next) ? next : "/admin";
};

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  if (!supabaseUrl || !publishableKey) {
    return { error: "The admin isn’t connected to Supabase yet." };
  }

  const db = await adminClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : "That email and password don’t match.",
    };
  }
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const db = await adminClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
