import type { Metadata } from "next";
import { beirutDate, orderLabel, phone, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { storeStatus } from "@/lib/hours";
import { adminClient } from "@/lib/supabase/server";
import { getOrderingBranch, ORDERING_BRANCH } from "@/server/catalog";
import { requireStaff } from "@/server/admin/session";
import { whatsappConfig } from "@/server/whatsapp";
import { AlertsForm, ClosuresCard, type DayHours, HoursForm, TimesForm, ZonesCard } from "./forms";
import { orderingNote } from "./ordering-note";
import { OrderingSwitch } from "./ordering-switch";

export const metadata: Metadata = { title: "Store" };

const hhmm = (time: string) => time.slice(0, 5);

export default async function StorePage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [branches, hours, closures, zones, alerts, ordering] = await Promise.all([
    db
      .from("branches")
      .select(
        "id, slug, name_en, last_order_minutes, pickup_eta_min, pickup_eta_max, delivery_eta_min, delivery_eta_max",
      )
      .order("created_at"),
    db.from("branch_hours").select("branch_id, weekday, opens_at, closes_at"),
    db
      .from("branch_closures")
      .select("id, branch_id, on_date, note")
      .gte("on_date", beirutDate())
      .order("on_date"),
    db
      .from("delivery_zones")
      .select("id, branch_id, name_en, name_ar, fee_cents, is_active")
      .order("sort_order")
      .order("name_en"),
    db.from("site_settings").select("value").eq("key", "order_alerts").maybeSingle(),
    getOrderingBranch(),
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
  for (const result of [branches, hours, closures, zones]) {
    if (result.error) throw new Error(`Loading the store failed: ${result.error.message}`);
  }

  const branchRows = branches.data!;
  const main = branchRows.find((b) => b.slug === ORDERING_BRANCH) ?? branchRows[0];
  const nameOf = (id: string) => branchRows.find((b) => b.id === id)?.name_en ?? "";
  const weekOf = (branchId: string): DayHours[] =>
    Array.from({ length: 7 }, (_, weekday) => {
      const row = hours.data!.find((h) => h.branch_id === branchId && h.weekday === weekday);
      return row
        ? { open: true, opens: hhmm(row.opens_at), closes: hhmm(row.closes_at) }
        : { open: false, opens: "12:00", closes: "00:00" };
    });
  const alertValue = (alerts.data?.value ?? {}) as { enabled?: boolean; phones?: string[] };

  return (
    <>
      <PageHeader title="Store" />
      <div className="flex flex-col gap-6">
        <OrderingSwitch
          value={ordering.schedule.ordering}
          open={storeStatus(ordering.schedule).open}
          note={orderingNote(ordering.schedule)}
          canChange
        />

        {main && (
          <div className="grid gap-6 wide:grid-cols-2">
            <TimesForm
              branchId={main.id}
              pickup={[main.pickup_eta_min, main.pickup_eta_max]}
              delivery={[main.delivery_eta_min, main.delivery_eta_max]}
            />
            {alertsConnected && (
              <AlertsForm
                enabled={alertValue.enabled ?? true}
                phones={(alertValue.phones ?? []).map(phone)}
                connected
                recent={(notifications ?? []).map((n) => ({
                  id: n.id,
                  order: n.orders ? orderLabel(n.orders.number) : "—",
                  recipient: phone(n.recipient),
                  status: n.status,
                  at: when(n.sent_at ?? n.created_at),
                  error: n.last_error,
                }))}
              />
            )}
          </div>
        )}

        {main && (
          <ZonesCard
            branchId={main.id}
            zones={zones
              .data!.filter((z) => z.branch_id === main.id)
              .map((z) => ({
                id: z.id,
                nameEn: z.name_en,
                nameAr: z.name_ar,
                fee: z.fee_cents,
                active: z.is_active,
              }))}
          />
        )}

        <div className="grid gap-6 wide:grid-cols-2">
          {branchRows.map((b) => (
            <HoursForm
              key={b.id}
              branchId={b.id}
              branchName={b.name_en}
              week={weekOf(b.id)}
              lastOrderMinutes={b.last_order_minutes}
            />
          ))}
        </div>

        <ClosuresCard
          branches={branchRows.map((b) => ({ id: b.id, name: b.name_en }))}
          closures={closures.data!.map((c) => ({
            id: c.id,
            branchName: nameOf(c.branch_id),
            date: c.on_date,
            note: c.note,
          }))}
        />
      </div>
    </>
  );
}
