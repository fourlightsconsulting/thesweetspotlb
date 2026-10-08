import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { publishableKey, supabaseUrl } from "@/lib/supabase/env";
import { adminClient } from "@/lib/supabase/server";

export type StaffRole = "staff" | "manager" | "owner";

const rank: Record<StaffRole, number> = { staff: 0, manager: 1, owner: 2 };

/** Whether a role has at least the access of `minimum` (owner > manager > staff). */
export const atLeast = (role: StaffRole, minimum: StaffRole) => rank[role] >= rank[minimum];

export type StaffMember = { userId: string; email: string; name: string; role: StaffRole };

export type Session =
  | { status: "signed-out" }
  /** Signed in, but not active staff (removed, or never added). */
  | { status: "no-access"; email: string }
  | { status: "staff"; staff: StaffMember };

/** Who's using the admin, once per request. */
export const getSession = cache(async (): Promise<Session> => {
  // Admin pages are per person: never prerendered, whatever the configuration.
  await connection();
  if (!supabaseUrl || !publishableKey) return { status: "signed-out" };
  const db = await adminClient();
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { status: "signed-out" };
  const email = String(claims.email ?? "");
  const { data: row } = await db
    .from("staff")
    .select("role, display_name, is_active")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (!row?.is_active) return { status: "no-access", email };
  return {
    status: "staff",
    staff: { userId: claims.sub, email, name: row.display_name, role: row.role as StaffRole },
  };
});

/**
 * The signed-in staff member, with at least `minimum` access. Anyone else is
 * sent to sign in (or told they have no access); staff without the role are
 * sent to the admin home. Row level security enforces the same rules in the
 * database; this keeps people out of pages they can't use.
 */
export async function requireStaff(minimum: StaffRole = "staff"): Promise<StaffMember> {
  const session = await getSession();
  if (session.status === "signed-out") redirect("/admin/login");
  if (session.status === "no-access") redirect("/admin/login?denied=1");
  if (!atLeast(session.staff.role, minimum)) redirect("/admin");
  return session.staff;
}
