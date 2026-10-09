import type { Metadata } from "next";
import Link from "next/link";
import { dateOf, money, phone } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { atLeast, requireStaff } from "@/server/admin/session";
import { customerQuery, readFilters, segments } from "./query";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const staff = await requireStaff();
  const params = await searchParams;
  const filters = readFilters(params);
  const page = Math.max(1, Number(params.page) || 1);

  const db = await adminClient();
  const { data, count, error } = await customerQuery(db, filters).range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );
  if (error) throw new Error(`Loading the customers failed: ${error.message}`);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const query = (extra: Record<string, string>) => {
    const next = new URLSearchParams({ q: filters.q, segment: filters.segment, ...extra });
    for (const [key, value] of [...next]) if (!value) next.delete(key);
    return next.toString();
  };

  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          atLeast(staff.role, "manager") && (
            <a href={`/admin/customers/export?${query({})}`} className="btn btn-secondary">
              <Icon name="download" className="size-4" />
              Download CSV
            </a>
          )
        }
      />

      <form className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="A name or 71 234 567"
            className="field"
          />
        </div>
        {filters.segment && <input type="hidden" name="segment" value={filters.segment} />}
        <button className="btn btn-primary">Search</button>
      </form>
      <nav aria-label="Segments" className="mb-4 flex flex-wrap gap-2">
        {segments.map((s) => (
          <Link
            key={s.value}
            href={`/admin/customers?${new URLSearchParams(
              Object.fromEntries(
                Object.entries({ q: filters.q, segment: s.value }).filter(([, v]) => v),
              ),
            )}`}
            aria-current={filters.segment === s.value ? "page" : undefined}
            className="pill h-8 px-3 text-[13px] hover:bg-line aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <p className="mb-2 text-[13px] text-muted">
        {count === 0
          ? "No customers match."
          : `${count} customer${count === 1 ? "" : "s"}${pages > 1 ? ` · page ${page} of ${pages}` : ""}`}
      </p>

      {data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-semibold">
                <th>Customer</th>
                <th className="text-end">Orders</th>
                <th className="text-end">Spent</th>
                <th>First order</th>
                <th>Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((c) => (
                <tr key={c.id} className="relative hover:bg-tint [&>td]:px-4 [&>td]:py-3">
                  <td>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-semibold after:absolute after:inset-0"
                    >
                      {c.name || "No name"}
                    </Link>
                    <span className="block text-[13px] text-muted">
                      {phone(c.phone ?? "")}
                      {c.preferred_locale === "ar" && " · Arabic"}
                      {c.marketing_opt_in_at && " · ✓ messages"}
                    </span>
                  </td>
                  <td className="text-end tabular-nums">{c.orders}</td>
                  <td className="text-end tabular-nums">{money(Number(c.spent_cents))}</td>
                  <td className="text-muted">
                    {c.first_order_at ? dateOf(c.first_order_at) : "—"}
                  </td>
                  <td className="text-muted">{c.last_order_at ? dateOf(c.last_order_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex justify-between">
          {page > 1 ? (
            <Link
              href={`/admin/customers?${query({ page: String(page - 1) })}`}
              className="btn btn-secondary"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link
              href={`/admin/customers?${query({ page: String(page + 1) })}`}
              className="btn btn-secondary"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
