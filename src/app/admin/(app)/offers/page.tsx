import type { Metadata } from "next";
import { dateOf, isoToBeirutLocal, money, when } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/admin/session";
import { CodeForm, type CodeValues, NewCode } from "./code-forms";

export const metadata: Metadata = { title: "Offers" };

type Row = {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "amount";
  value: number;
  min_subtotal_cents: number;
  max_discount_cents: number | null;
  first_order_only: boolean;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

function status(code: Row, uses: number, now: Date): { label: string; tone: string } {
  if (!code.is_active) return { label: "Off", tone: "" };
  if (code.starts_at && new Date(code.starts_at) > now)
    return { label: `Starts ${dateOf(code.starts_at)}`, tone: "bg-wait-soft text-wait" };
  if (code.ends_at && new Date(code.ends_at) < now) return { label: "Ended", tone: "" };
  if (code.usage_limit && uses >= code.usage_limit) return { label: "Used up", tone: "" };
  return { label: "Live", tone: "bg-accent-soft text-accent" };
}

/** "20% off, up to $5 · from $15 · first order · 1 per customer". */
function summary(code: Row) {
  const parts = [
    code.kind === "percent"
      ? `${code.value}% off${code.max_discount_cents ? `, up to ${money(code.max_discount_cents)}` : ""}`
      : `${money(code.value)} off`,
  ];
  if (code.min_subtotal_cents) parts.push(`from ${money(code.min_subtotal_cents)}`);
  if (code.first_order_only) parts.push("first order");
  if (code.usage_limit_per_customer) parts.push(`${code.usage_limit_per_customer} per customer`);
  if (code.usage_limit) parts.push(`${code.usage_limit} in total`);
  if (code.ends_at) parts.push(`until ${dateOf(code.ends_at)}`);
  return parts.join(" · ");
}

export default async function OffersPage() {
  await requireStaff("manager");
  const db = await adminClient();
  const [codes, usage] = await Promise.all([
    db.from("discount_codes").select("*").order("created_at", { ascending: false }),
    db.from("discount_code_usage").select("*"),
  ]);
  if (codes.error) throw new Error(`Loading the codes failed: ${codes.error.message}`);
  const usageOf = (id: string) => usage.data?.find((u) => u.code_id === id);
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Offers"
        help="Discounts apply to food, not delivery. Dates and times are Beirut time. A cancelled order gives its code use back."
      />
      <div className="mb-4">
        <NewCode />
      </div>
      {codes.data.length === 0 ? (
        <p className="text-muted">No codes yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {codes.data.map((code) => {
            const used = usageOf(code.id);
            const uses = used?.uses ?? 0;
            const s = status(code, uses, now);
            const values: CodeValues = {
              id: code.id,
              code: code.code,
              description: code.description,
              kind: code.kind,
              value: code.value,
              minSubtotal: code.min_subtotal_cents,
              maxDiscount: code.max_discount_cents,
              firstOrderOnly: code.first_order_only,
              usageLimit: code.usage_limit,
              perCustomer: code.usage_limit_per_customer,
              startsAt: code.starts_at ? isoToBeirutLocal(code.starts_at) : "",
              endsAt: code.ends_at ? isoToBeirutLocal(code.ends_at) : "",
              active: code.is_active,
            };
            return (
              <li key={code.id}>
                <details className="group card">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="font-mono font-bold">{code.code}</span>
                    <span className={`pill ${s.tone}`}>{s.label}</span>
                    <span className="min-w-0 flex-1 text-[13px] text-muted">{summary(code)}</span>
                    <span className="text-[13px] tabular-nums">
                      <span className="font-semibold">{uses}</span> use{uses === 1 ? "" : "s"}
                      {used && uses > 0 && (
                        <span className="text-muted">
                          {" "}
                          · {money(Number(used.discount_cents))} off ·{" "}
                          {money(Number(used.sales_cents))} in orders
                          {used.last_used_at && ` · last ${when(used.last_used_at)}`}
                        </span>
                      )}
                    </span>
                  </summary>
                  <div className="border-t border-line p-4">
                    {code.description && <p className="mb-3 text-muted">{code.description}</p>}
                    <CodeForm code={values} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
