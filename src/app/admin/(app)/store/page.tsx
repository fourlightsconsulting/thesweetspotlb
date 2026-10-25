import type { Metadata } from "next";
import { beirutDate, orderLabel, phone, when } from "@/components/admin/format";
import { alphabetical } from "@/lib/alphabetical";
import { adminClient } from "@/lib/supabase/server";
import { ORDERING_BRANCH } from "@/server/catalog";
import { requireStaff } from "@/server/admin/session";
import { whatsappConfig } from "@/server/whatsapp";
import { StoreForm } from "./store-form";
import type { DayHours } from "./store-settings";

export const metadata: Metadata = { title: "Store" };

const hhmm = (time: string) => time.slice(0, 5);

export default async function StorePage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [branches, hours, closures, zones, areas, alerts] = await Promise.all([
    db
      .from("branches")
      .select(
        "id, slug, name_en, ordering, last_order_minutes, pickup_eta_min, pickup_eta_max, delivery_eta_min, delivery_eta_max",
      )
      .order("created_at"),
    db.from("branch_hours").select("branch_id, weekday, opens_at, closes_at"),
    db
      .from("branch_closures")
      .select("id, branch_id, on_date, note")
      .gte("on_date", beirutDate())
      .order("on_date"),
    db.from("delivery_zones").select("id, branch_id, name, fee_cents").order("name"),
    db
      .from("delivery_areas")
      .select("id, branch_id, zone_id, name_en, name_ar, is_active")
      .order("name_en"),
    db.from("site_settings").select("value").eq("key", "order_alerts").maybeSingle(),
  ]);
  // Paid WhatsApp alerts show only once their settings exist; until then the
  // customer sends each order to the shop's WhatsApp from the confirmation page.
  const alertsConnected = whatsappConfig() !== null;
  const { data: notifications } = alertsConnected
    ? await db
        .from("notifications")
        .select("id, recipient, status, created_at, sent_at, last_error, orders(number)")
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };
  for (const result of [branches, hours, closures, zones, areas]) {
    if (result.error) throw new Error(`Loading the store failed: ${result.error.message}`);
  }

  const branchRows = branches.data!;
  const main = branchRows.find((b) => b.slug === ORDERING_BRANCH) ?? branchRows[0];
  const weekOf = (branchId: string): DayHours[] =>
    Array.from({ length: 7 }, (_, weekday) => {
      const row = hours.data!.find((h) => h.branch_id === branchId && h.weekday === weekday);
      return row
        ? { open: true, opens: hhmm(row.opens_at), closes: hhmm(row.closes_at) }
        : { open: false, opens: "12:00", closes: "00:00" };
    });
  const alertValue = (alerts.data?.value ?? {}) as { enabled?: boolean; phones?: string[] };

  if (!main) throw new Error("The ordering branch is missing.");
  return (
    <StoreForm
      today={beirutDate()}
      initial={{
        branchId: main.id,
        ordering: main.ordering as "hours" | "open" | "paused",
        pickupMin: String(main.pickup_eta_min),
        pickupMax: String(main.pickup_eta_max),
        deliveryMin: String(main.delivery_eta_min),
        deliveryMax: String(main.delivery_eta_max),
        zones: alphabetical(
          zones.data!.filter((zone) => zone.branch_id === main.id),
          (zone) => zone.name,
        ).map((zone) => ({
          id: zone.id,
          name: zone.name,
          fee: (zone.fee_cents / 100).toFixed(2),
        })),
        areas: alphabetical(
          areas.data!.filter((area) => area.branch_id === main.id),
          (area) => area.name_en,
        ).map((area) => ({
          id: area.id,
          zoneId: area.zone_id,
          nameEn: area.name_en,
          nameAr: area.name_ar,
          active: area.is_active,
        })),
        hours: branchRows.map((branch) => ({
          branchId: branch.id,
          branchName: branch.name_en,
          week: weekOf(branch.id),
          lastOrderMinutes: String(branch.last_order_minutes),
        })),
        closures: closures.data!.map((closure) => ({
          id: closure.id,
          branchId: closure.branch_id,
          date: closure.on_date,
          note: closure.note,
        })),
        removedZoneIds: [],
        removedAreaIds: [],
        removedClosureIds: [],
        alerts: alertsConnected
          ? {
              enabled: alertValue.enabled ?? true,
              phones: (alertValue.phones ?? []).map(phone).join("\n"),
            }
          : null,
      }}
      recent={(notifications ?? []).map((n) => ({
        id: n.id,
        order: n.orders ? orderLabel(n.orders.number) : "—",
        recipient: phone(n.recipient),
        status: n.status,
        at: when(n.sent_at ?? n.created_at),
        error: n.last_error,
      }))}
    />
  );
}
