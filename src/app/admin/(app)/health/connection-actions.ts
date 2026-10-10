"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { adminClient } from "@/lib/supabase/server";
import { failed, saved } from "@/server/admin/form-state";
import { requireStaff } from "@/server/admin/session";

// Running the scheduled jobs by hand, and ad spend that no platform reports.

const jobs = z.enum(["meta-ads", "social", "google", "sweep"]);
const isoDate = z.iso.date();

/** Starts a job now; with dates, it fetches that range instead of its usual window. */
export async function runJob(
  job: string,
  range?: { since: string; until: string },
): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const name = jobs.parse(job);
  let body = {};
  if (range) {
    const since = isoDate.safeParse(range.since);
    const until = isoDate.safeParse(range.until);
    if (!since.success || !until.success || since.data > until.data)
      return { error: "Pick a start date on or before the end date." };
    body = { since: since.data, until: until.data };
  }
  const db = await adminClient();
  const { error } = await db.rpc("run_job", { p_job: name, p_body: body });
  if (error) return { error: "It didn’t start. Try again." };
  revalidatePath("/admin/health");
  return { error: null };
}

/** Spend that no platform reports: flyers, influencers, printed menus… */
export async function addSpend(_prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("manager");
  const parsed = z
    .object({
      day: isoDate,
      channel: z.string().trim().min(1).max(80),
      amount: z.coerce.number().positive().max(100_000),
      note: z.string().trim().max(200),
    })
    .safeParse({
      day: form.get("day"),
      channel: form.get("channel"),
      amount: form.get("amount"),
      note: form.get("note") ?? "",
    });
  if (!parsed.success) return failed("Give it a date, what it was for and an amount.");
  const v = parsed.data;
  const db = await adminClient();
  const { error } = await db.from("ad_performance").insert({
    platform: "manual",
    day: v.day,
    // Each entry is its own row, even two on the same day for the same thing.
    campaign_id: crypto.randomUUID(),
    campaign_name: v.channel,
    spend_cents: Math.round(v.amount * 100),
    note: v.note,
    created_by: staff.userId,
  });
  if (error) return failed();
  revalidatePath("/admin/health");
  return saved();
}

export async function removeSpend(id: number): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db
    .from("ad_performance")
    .delete()
    .eq("id", z.number().int().positive().parse(id))
    .eq("platform", "manual");
  if (error) return { error: "That didn’t save. Try again." };
  revalidatePath("/admin/health");
  return { error: null };
}
