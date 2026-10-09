"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { presets } from "./period";
import { type DashboardTab, dashboardTabs } from "./tabs";

type Props = {
  tab: DashboardTab;
  period: { preset: string; from: string; to: string; label: string };
};

/** The dashboard tabs and the period, both kept in the address. */
export function DashboardControls({ tab, period }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [custom, setCustom] = useState(period.preset === "custom");
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);

  const href = (changes: Record<string, string>) => {
    const params = new URLSearchParams({
      tab,
      period: period.preset,
      ...(period.preset === "custom" ? { from: period.from, to: period.to } : {}),
      ...changes,
    });
    if (params.get("period") !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    if (params.get("tab") === "overview") params.delete("tab");
    if (params.get("period") === "7d") params.delete("period");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="mb-5 flex flex-col gap-3 wide:flex-row wide:items-end wide:justify-between">
      <nav aria-label="Dashboards" className="flex gap-1 overflow-x-auto border-b border-line">
        {dashboardTabs.map((t) => (
          <Link
            key={t.key}
            href={href({ tab: t.key })}
            aria-current={t.key === tab ? "page" : undefined}
            className="-mb-px border-b-2 border-transparent px-3 py-2 font-semibold whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[13px]">
          <span className="sr-only">Period</span>
          <select
            value={custom ? "custom" : period.preset}
            onChange={(e) => {
              if (e.target.value === "custom") setCustom(true);
              else {
                setCustom(false);
                router.push(href({ period: e.target.value }));
              }
            }}
            className="field min-h-[36px] w-auto py-1.5"
          >
            {presets.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom">Pick dates…</option>
          </select>
        </label>
        {custom && (
          <>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From"
              className="field min-h-[36px] w-auto py-1.5"
            />
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To"
              className="field min-h-[36px] w-auto py-1.5"
            />
            <button
              type="button"
              disabled={!from || !to || from > to}
              onClick={() => router.push(href({ period: "custom", from, to }))}
              className="btn btn-secondary"
            >
              Show
            </button>
          </>
        )}
      </div>
    </div>
  );
}
