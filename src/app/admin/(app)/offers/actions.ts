"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { beirutLocalToIso } from "@/components/admin/format";
import { adminClient } from "@/lib/supabase/server";
import { failed, saved } from "@/server/admin/form-state";
import { requireStaff } from "@/server/admin/session";

// Discount codes. The website checks them live (check_discount_code), so
// changes apply to the next checkout without refreshing any page.

const optionalCents = z
  .union([z.literal(""), z.coerce.number().min(0).max(10_000)])
  .transform((v) => (v === "" ? null : Math.round(v * 100)));
const optionalCount = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(1_000_000)])
  .transform((v) => (v === "" ? null : v));
const optionalTime = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)])
  .transform((v) => (v === "" ? null : beirutLocalToIso(v)));

export async function saveCode(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const field = (key: string) => form.get(key) ?? "";
  const parsed = z
    .object({
      id: z.uuid().optional(),
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{3,24}$/),
      description: z.string().trim().max(200),
      kind: z.enum(["percent", "amount"]),
      value: z.coerce.number().positive().max(10_000),
      minSubtotal: optionalCents,
      maxDiscount: optionalCents,
      usageLimit: optionalCount,
      perCustomer: optionalCount,
      startsAt: optionalTime,
      endsAt: optionalTime,
    })
    .safeParse({
      id: form.get("id") || undefined,
      code: field("code"),
      description: field("description"),
      kind: field("kind"),
      value: field("value"),
      minSubtotal: field("minSubtotal"),
      maxDiscount: field("maxDiscount"),
      usageLimit: field("usageLimit"),
      perCustomer: field("perCustomer"),
      startsAt: field("startsAt"),
      endsAt: field("endsAt"),
    });
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    return failed(
      path === "code"
        ? "Codes are 3–24 letters and numbers, no spaces."
        : path === "value"
          ? "Enter how much the code takes off."
          : "Check the highlighted values.",
    );
  }
  const v = parsed.data;
  const value = v.kind === "percent" ? Math.round(v.value) : Math.round(v.value * 100);
  if (v.kind === "percent" && value > 100) return failed("A percentage can’t be over 100.");
  if (v.startsAt && v.endsAt && v.startsAt >= v.endsAt)
    return failed("It has to end after it starts.");

  const fields = {
    code: v.code,
    description: v.description,
    kind: v.kind,
    value,
    min_subtotal_cents: v.minSubtotal ?? 0,
    max_discount_cents: v.kind === "percent" ? v.maxDiscount : null,
    first_order_only: form.get("firstOrderOnly") === "on",
    usage_limit: v.usageLimit,
    usage_limit_per_customer: v.perCustomer,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    is_active: form.get("active") === "on",
  };

  const db = await adminClient();
  const { error } = v.id
    ? await db.from("discount_codes").update(fields).eq("id", v.id)
    : await db.from("discount_codes").insert(fields);
  if (error) return failed(error.code === "23505" ? `${v.code} already exists.` : undefined);
  revalidatePath("/admin/offers");
  return saved();
}

export async function deleteCode(id: string): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("discount_codes").delete().eq("id", z.uuid().parse(id));
  if (error)
    return {
      error:
        error.code === "23503"
          ? "Orders used this code, so it stays for the records. Switch it off instead."
          : "That didn’t save. Try again.",
    };
  revalidatePath("/admin/offers");
  return { error: null };
}
