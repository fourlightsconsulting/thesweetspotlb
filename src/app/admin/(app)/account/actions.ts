"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";

export type AccountState = { status: "idle" | "saved" } | { status: "error"; message: string };

export async function rename(_prev: AccountState, form: FormData): Promise<AccountState> {
  const me = await requireStaff();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) return { status: "error", message: "Enter your name." };
  const db = await adminClient();
  const { error } = await db.from("staff").update({ display_name: name }).eq("user_id", me.userId);
  if (error) return { status: "error", message: "That didn’t save. Try again." };
  revalidatePath("/admin", "layout");
  return { status: "saved" };
}

export async function changePassword(_prev: AccountState, form: FormData): Promise<AccountState> {
  await requireStaff();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) {
    return { status: "error", message: "Use at least 10 characters." };
  }
  if (password !== confirm) return { status: "error", message: "The two passwords don’t match." };
  const db = await adminClient();
  const { error } = await db.auth.updateUser({ password });
  if (error) {
    return {
      status: "error",
      message: error.code === "same_password" ? "That’s your current password." : error.message,
    };
  }
  return { status: "saved" };
}
