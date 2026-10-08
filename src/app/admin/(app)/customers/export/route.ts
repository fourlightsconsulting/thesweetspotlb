import { beirutDate } from "@/components/admin/format";
import { adminClient } from "@/lib/supabase/server";
import { atLeast, getSession } from "@/server/admin/session";
import { customerQuery, readFilters } from "../query";

// The customer list as a spreadsheet (managers and owners), with the page's
// filters. Phone numbers are in international form so they import cleanly.

const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote everything; neutralise formulas a spreadsheet would run.
  return `"${(/^[=+\-@]/.test(text) && !/^\+\d+$/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (session.status !== "staff" || !atLeast(session.staff.role, "manager"))
    return new Response("Not allowed", { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const db = await adminClient();
  const { data, error } = await customerQuery(db, readFilters(params)).range(0, 9999);
  if (error) return new Response("The export failed", { status: 500 });

  const header = [
    "Name",
    "Phone",
    "Email",
    "Language",
    "Orders",
    "Spent ($)",
    "First order",
    "Last order",
    "Messages OK",
  ];
  const rows = data.map((c) => [
    c.name,
    c.phone,
    c.email,
    c.preferred_locale,
    c.orders,
    (Number(c.spent_cents) / 100).toFixed(2),
    c.first_order_at ? beirutDate(new Date(c.first_order_at)) : "",
    c.last_order_at ? beirutDate(new Date(c.last_order_at)) : "",
    c.marketing_opt_in_at ? "yes" : "no",
  ]);
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sweet-spot-customers-${beirutDate()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
