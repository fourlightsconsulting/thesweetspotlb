"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { requireStaff } from "@/server/admin/session";

// Team changes are owner-only: checked here, and again by row level security
// (staff rows) and the database guard (no self-demotion, always one owner).
// Sign-in accounts are created with the secret key; staff rows are written
// as the owner, so the audit log records who did it.

export type TeamState =
  | { status: "idle" }
  | { status: "error"; message: string }
  /** `password` is shown once so the owner can pass it on; null for an existing account. */
  | { status: "added"; email: string; password: string | null }
  | { status: "reset"; email: string; password: string };

const roles = z.enum(["staff", "manager", "owner"]);

/** 14 characters without look-alikes (0/O, 1/l/I), from the secure random source. */
function temporaryPassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const friendly = (message: string) =>
  message.includes("own role") || message.includes("active owner")
    ? message.replace(/^staff: /, "").replace(/^./, (c) => c.toUpperCase()) + "."
    : "That didn’t save. Try again.";

export async function addMember(_prev: TeamState, form: FormData): Promise<TeamState> {
  await requireStaff("owner");
  const parsed = z
    .object({
      email: z.email().transform((e) => e.toLowerCase()),
      name: z.string().trim().min(1).max(80),
      role: roles,
    })
    .safeParse({ email: form.get("email"), name: form.get("name"), role: form.get("role") });
  if (!parsed.success)
    return { status: "error", message: "Enter a name, a valid email and a role." };
  const { email, name, role } = parsed.data;

  const service = serviceClient();
  if (!service) return { status: "error", message: "Supabase isn’t connected yet." };

  let password: string | null = temporaryPassword();
  let userId: string;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    // Already has a sign-in (e.g. someone coming back): keep their password.
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    const existing = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) return { status: "error", message: "That account couldn’t be created." };
    userId = existing.id;
    password = null;
  }

  const db = await adminClient();
  const { error } = await db
    .from("staff")
    .upsert({ user_id: userId, display_name: name, role, is_active: true });
  if (error) return { status: "error", message: friendly(error.message) };

  revalidatePath("/admin/team");
  return { status: "added", email, password };
}

export async function updateMember(form: FormData) {
  await requireStaff("owner");
  const userId = z.uuid().parse(form.get("userId"));
  const change: { role?: z.infer<typeof roles>; is_active?: boolean } = {};
  if (form.has("role")) change.role = roles.parse(form.get("role"));
  if (form.has("active")) change.is_active = form.get("active") === "true";

  const db = await adminClient();
  const { error } = await db.from("staff").update(change).eq("user_id", userId);
  revalidatePath("/admin/team");
  return error ? { error: friendly(error.message) } : { error: null };
}

export async function resetPassword(_prev: TeamState, form: FormData): Promise<TeamState> {
  await requireStaff("owner");
  const userId = z.uuid().parse(form.get("userId"));
  const service = serviceClient();
  if (!service) return { status: "error", message: "Supabase isn’t connected yet." };

  const password = temporaryPassword();
  const { data, error } = await service.auth.admin.updateUserById(userId, { password });
  if (error || !data.user) return { status: "error", message: "The password couldn’t be reset." };
  return { status: "reset", email: data.user.email ?? "", password };
}
