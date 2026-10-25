import { z } from "zod";
import type { Ordering } from "@/lib/hours";
import { normalisePhone } from "@/lib/phone";

export type DayHours = { open: boolean; opens: string; closes: string };
export type ZoneDraft = { id: string; name: string; fee: string };
export type AreaDraft = {
  id: string;
  zoneId: string;
  nameEn: string;
  nameAr: string;
  active: boolean;
};
export type HoursDraft = {
  branchId: string;
  branchName: string;
  week: DayHours[];
  lastOrderMinutes: string;
};
export type ClosureDraft = { id: string; branchId: string; date: string; note: string };
export type StoreDraft = {
  branchId: string;
  ordering: Ordering;
  pickupMin: string;
  pickupMax: string;
  deliveryMin: string;
  deliveryMax: string;
  zones: ZoneDraft[];
  areas: AreaDraft[];
  hours: HoursDraft[];
  closures: ClosureDraft[];
  removedZoneIds: string[];
  removedAreaIds: string[];
  removedClosureIds: string[];
  alerts: { enabled: boolean; phones: string } | null;
};

const name = z.string().trim().min(1, "Fill in every zone and area name.").max(60);
const integer = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, "Fill in every time and order limit.")
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const idList = z.array(z.uuid()).max(1000);
const schema = z
  .object({
    branchId: z.uuid(),
    ordering: z.enum(["hours", "open", "paused"]),
    pickupMin: integer(1, 240),
    pickupMax: integer(1, 240),
    deliveryMin: integer(1, 240),
    deliveryMax: integer(1, 240),
    zones: z
      .array(
        z.object({
          id: z.uuid(),
          name,
          fee: z
            .string()
            .trim()
            .regex(
              /^\d+(?:\.\d{1,2})?$/,
              "Enter each zone fee in dollars, with up to two decimal places.",
            )
            .transform(Number)
            .pipe(z.number().min(0).max(1000))
            .transform((dollars) => Math.round(dollars * 100)),
        }),
      )
      .max(100),
    areas: z
      .array(
        z.object({
          id: z.uuid(),
          zoneId: z.uuid(),
          nameEn: name,
          nameAr: name,
          active: z.boolean(),
        }),
      )
      .max(1000),
    hours: z
      .array(
        z.object({
          branchId: z.uuid(),
          lastOrderMinutes: integer(0, 180),
          week: z.array(z.object({ open: z.boolean(), opens: time, closes: time })).length(7),
        }),
      )
      .min(1)
      .max(100),
    closures: z
      .array(
        z.object({
          id: z.uuid(),
          branchId: z.uuid(),
          date: z.iso.date(),
          note: z.string().trim().max(80),
        }),
      )
      .max(1000),
    removedZoneIds: idList,
    removedAreaIds: idList,
    removedClosureIds: idList,
    alerts: z.object({ enabled: z.boolean(), phones: z.string().max(300) }).nullable(),
  })
  .superRefine((value, context) => {
    const issue = (message: string) => context.addIssue({ code: "custom", message });
    if (value.pickupMin > value.pickupMax || value.deliveryMin > value.deliveryMax)
      issue("The first ready time can’t be more than the second.");
    const zoneIds = new Set(value.zones.map((zone) => zone.id));
    if (
      zoneIds.size !== value.zones.length ||
      new Set(value.areas.map((area) => area.id)).size !== value.areas.length
    )
      issue("A zone or area appears more than once. Reload and try again.");
    if (new Set(value.zones.map((zone) => zone.name.toLowerCase())).size !== value.zones.length)
      issue("Give every delivery zone a different name.");
    if (value.areas.some((area) => !zoneIds.has(area.zoneId)))
      issue("Move all areas out of a zone before removing it.");
    const branches = new Set(value.hours.map((branch) => branch.branchId));
    if (
      !branches.has(value.branchId) ||
      branches.size !== value.hours.length ||
      value.closures.some((closure) => !branches.has(closure.branchId))
    )
      issue("Choose a valid branch for every setting.");
    if (
      value.hours.some((branch) => branch.week.some((day) => day.open && day.opens === day.closes))
    )
      issue("A day can’t open and close at the same time.");
    if (
      new Set(value.closures.map((closure) => `${closure.branchId}:${closure.date}`)).size !==
      value.closures.length
    )
      issue("A branch can’t have the same closed day twice.");
    if (
      value.removedZoneIds.some((id) => zoneIds.has(id)) ||
      value.removedAreaIds.some((id) => value.areas.some((area) => area.id === id)) ||
      value.removedClosureIds.some((id) => value.closures.some((closure) => closure.id === id))
    )
      issue("A removed record is still in the draft. Reload and try again.");
  });

export function parseStoreSettings(raw: unknown) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Check the store settings.",
    };
  const draft = parsed.data;
  const phones: string[] = [];
  if (draft.alerts) {
    for (const line of draft.alerts.phones
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter(Boolean)) {
      const phone = normalisePhone(line) ?? (/^\+[1-9]\d{7,14}$/.test(line) ? line : null);
      if (!phone)
        return { ok: false as const, error: `“${line}” isn’t a phone number we can message.` };
      if (!phones.includes(phone)) phones.push(phone);
    }
    if (phones.length > 5) return { ok: false as const, error: "Up to 5 alert phone numbers." };
  }
  return {
    ok: true as const,
    value: { ...draft, alerts: draft.alerts ? { enabled: draft.alerts.enabled, phones } : null },
  };
}
