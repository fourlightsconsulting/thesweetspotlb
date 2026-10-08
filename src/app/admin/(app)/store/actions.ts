"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { beirutDate } from "@/components/admin/format";
import type { Ordering } from "@/lib/hours";
import { normalisePhone } from "@/lib/phone";
import { slugify } from "@/lib/slug";
import { adminClient } from "@/lib/supabase/server";
import { catalogTags, ORDERING_BRANCH } from "@/server/catalog";
import { sendOrderAlerts } from "@/server/order-alerts";
import { failed, saved } from "@/server/admin/form-state";
import { requireStaff } from "@/server/admin/session";

// Store settings are for managers: checked here, and again by row level
// security on the branch tables. Every save refreshes the public pages that
// show hours or take orders (the "store" tag).

const orderingSchema = z.enum(["hours", "open", "paused"]);

/** The online-ordering switch: follow the hours, open whatever the hours, or paused. */
export async function setOrdering(value: Ordering): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const ordering = orderingSchema.parse(value);
  const db = await adminClient();
  const { data, error } = await db
    .from("branches")
    .update({ ordering })
    .eq("slug", ORDERING_BRANCH)
    .select("id");
  if (error || data.length === 0) return { error: "That didn’t save. Try again." };
  updateTag(catalogTags.store);
  return { error: null };
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** A branch's week: each day open or closed, with its times, and the last-order margin. */
export async function saveHours(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const branchId = z.uuid().parse(form.get("branchId"));
  const last = z.coerce.number().int().min(0).max(180).safeParse(form.get("lastOrderMinutes"));
  if (!last.success) return failed("Last orders: between 0 and 180 minutes before closing.");

  const open: { branch_id: string; weekday: number; opens_at: string; closes_at: string }[] = [];
  const closed: number[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (form.get(`open-${weekday}`) !== "on") {
      closed.push(weekday);
      continue;
    }
    const opens = time.safeParse(form.get(`opens-${weekday}`));
    const closes = time.safeParse(form.get(`closes-${weekday}`));
    if (!opens.success || !closes.success) return failed("Give every open day both times.");
    if (opens.data === closes.data) return failed("A day can’t open and close at the same time.");
    open.push({ branch_id: branchId, weekday, opens_at: opens.data, closes_at: closes.data });
  }

  const db = await adminClient();
  const results = await Promise.all([
    open.length > 0 ? db.from("branch_hours").upsert(open) : Promise.resolve({ error: null }),
    closed.length > 0
      ? db.from("branch_hours").delete().eq("branch_id", branchId).in("weekday", closed)
      : Promise.resolve({ error: null }),
    db.from("branches").update({ last_order_minutes: last.data }).eq("id", branchId),
  ]);
  if (results.some((r) => r.error)) return failed();
  updateTag(catalogTags.store);
  return saved();
}

export async function addClosure(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const parsed = z
    .object({
      branchId: z.uuid(),
      date: z.iso.date(),
      note: z.string().trim().max(80),
    })
    .safeParse({ branchId: form.get("branchId"), date: form.get("date"), note: form.get("note") });
  if (!parsed.success) return failed("Pick a date.");
  if (parsed.data.date < beirutDate()) return failed("Pick today or a day ahead.");

  const db = await adminClient();
  const { error } = await db.from("branch_closures").insert({
    branch_id: parsed.data.branchId,
    on_date: parsed.data.date,
    note: parsed.data.note,
  });
  if (error) return failed(error.code === "23505" ? "That day is already closed." : undefined);
  updateTag(catalogTags.store);
  return saved();
}

export async function removeClosure(id: string): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("branch_closures").delete().eq("id", z.uuid().parse(id));
  if (error) return { error: "That didn’t save. Try again." };
  updateTag(catalogTags.store);
  return { error: null };
}

const minutes = z.coerce.number().int().min(1).max(240);

/** How long orders take, as promised on the website and stored on each order. */
export async function saveTimes(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const parsed = z
    .object({
      branchId: z.uuid(),
      pickupMin: minutes,
      pickupMax: minutes,
      deliveryMin: minutes,
      deliveryMax: minutes,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return failed("Times are whole minutes, from 1 to 240.");
  const t = parsed.data;
  if (t.pickupMin > t.pickupMax || t.deliveryMin > t.deliveryMax)
    return failed("The first time of each range can’t be more than the second.");

  const db = await adminClient();
  const { error } = await db
    .from("branches")
    .update({
      pickup_eta_min: t.pickupMin,
      pickup_eta_max: t.pickupMax,
      delivery_eta_min: t.deliveryMin,
      delivery_eta_max: t.deliveryMax,
    })
    .eq("id", t.branchId);
  if (error) return failed();
  updateTag(catalogTags.store);
  return saved();
}

const dollars = z.coerce
  .number()
  .min(0)
  .max(1000)
  .transform((d) => Math.round(d * 100));

/** Adds a delivery area, or changes one (with `id`). */
export async function saveZone(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const parsed = z
    .object({
      id: z.uuid().optional(),
      branchId: z.uuid(),
      nameEn: z.string().trim().min(1).max(60),
      nameAr: z.string().trim().min(1).max(60),
      fee: dollars,
    })
    .safeParse({
      id: form.get("id") || undefined,
      branchId: form.get("branchId"),
      nameEn: form.get("nameEn"),
      nameAr: form.get("nameAr"),
      fee: form.get("fee"),
    });
  if (!parsed.success) return failed("Give the area a name in English and Arabic, and a fee.");
  const area = parsed.data;
  const isActive = form.get("active") === "on";

  const db = await adminClient();
  if (area.id) {
    const { error } = await db
      .from("delivery_zones")
      .update({
        name_en: area.nameEn,
        name_ar: area.nameAr,
        fee_cents: area.fee,
        is_active: isActive,
      })
      .eq("id", area.id);
    if (error) return failed();
  } else {
    const { data: last } = await db
      .from("delivery_zones")
      .select("sort_order")
      .eq("branch_id", area.branchId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db.from("delivery_zones").insert({
      branch_id: area.branchId,
      slug: slugify(area.nameEn, "area"),
      name_en: area.nameEn,
      name_ar: area.nameAr,
      fee_cents: area.fee,
      is_active: true,
      sort_order: (last?.sort_order ?? 0) + 10,
    });
    if (error)
      return failed(error.code === "23505" ? "There’s already an area by that name." : undefined);
  }
  updateTag(catalogTags.store);
  return saved();
}

export async function removeZone(id: string): Promise<{ error: string | null }> {
  await requireStaff("manager");
  const db = await adminClient();
  const { error } = await db.from("delivery_zones").delete().eq("id", z.uuid().parse(id));
  if (error)
    return {
      error:
        error.code === "23503"
          ? "Orders were delivered to this area, so it stays. Switch it off instead."
          : "That didn’t save. Try again.",
    };
  updateTag(catalogTags.store);
  return { error: null };
}

/** Moves an area one place up or down the checkout list. */
export async function moveZone(id: string, direction: "up" | "down") {
  await requireStaff("manager");
  const db = await adminClient();
  const { data: zone } = await db
    .from("delivery_zones")
    .select("branch_id")
    .eq("id", z.uuid().parse(id))
    .single();
  if (!zone) return { error: "That area wasn’t found." };
  const { data: zones } = await db
    .from("delivery_zones")
    .select("id")
    .eq("branch_id", zone.branch_id)
    .order("sort_order")
    .order("name_en");
  const list = (zones ?? []).map((z) => z.id);
  const from = list.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= list.length) return { error: null };
  [list[from], list[to]] = [list[to], list[from]];
  const results = await Promise.all(
    list.map((zoneId, i) =>
      db
        .from("delivery_zones")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", zoneId),
    ),
  );
  if (results.some((r) => r.error)) return { error: "That didn’t save. Try again." };
  updateTag(catalogTags.store);
  return { error: null };
}

/** Who gets a WhatsApp message for each new order. */
export async function saveAlerts(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("manager");
  const lines = String(form.get("phones") ?? "")
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const phones: string[] = [];
  for (const line of lines) {
    const e164 = normalisePhone(line) ?? (/^\+[1-9]\d{7,14}$/.test(line) ? line : null);
    if (!e164) return failed(`“${line}” isn’t a phone number we can message.`);
    if (!phones.includes(e164)) phones.push(e164);
  }
  if (phones.length > 5) return failed("Up to 5 numbers.");

  const db = await adminClient();
  const { error } = await db.from("site_settings").upsert({
    key: "order_alerts",
    value: { enabled: form.get("enabled") === "on", phones },
    is_public: false,
  });
  if (error) return failed();
  return saved();
}

/** Sends any new-order alerts that are still queued or failed. */
export async function retryAlerts(): Promise<{ message: string }> {
  await requireStaff("manager");
  const result = await sendOrderAlerts();
  if (!result.configured) return { message: "WhatsApp isn’t connected yet, so alerts wait." };
  if (result.sent + result.failed === 0) return { message: "Nothing waiting to send." };
  return {
    message: `${result.sent} sent${result.failed ? `, ${result.failed} failed again` : ""}.`,
  };
}
