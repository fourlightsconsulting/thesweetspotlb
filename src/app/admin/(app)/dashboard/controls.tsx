"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { DEFAULT_PRESET } from "./period";
import { PeriodPicker } from "./period-picker";
import { type DashboardTab, dashboardTabs } from "./tabs";

type Props = {
  tab: DashboardTab;
  period: { preset: string; from: string; to: string };
  compare: boolean;
  /** Today in Beirut, from the server. */
  today: string;
};

/**
 * One bar for the reports: the tabs on the left, the period and "vs previous"
 * on the right (beneath the tabs on narrower screens). All of it lives in the
 * address, so a view can be shared or reloaded.
 */
export function DashboardControls({ tab, period, compare, today }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const href = (changes: Record<string, string>) => {
    const params = new URLSearchParams({
      tab,
      period: period.preset,
      ...(period.preset === "custom" ? { from: period.from, to: period.to } : {}),
      compare: compare ? "on" : "off",
      ...changes,
    });
    if (params.get("period") !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    if (params.get("tab") === "overview") params.delete("tab");
    if (params.get("period") === DEFAULT_PRESET) params.delete("period");
    if (params.get("compare") === "on") params.delete("compare");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="card mb-6 flex flex-col gap-2 p-2 min-[1080px]:flex-row min-[1080px]:items-center min-[1080px]:gap-3">
      <nav
        aria-label="Reports"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {dashboardTabs.map((t) => (
          <Link
            key={t.key}
            href={href({ tab: t.key })}
            aria-current={t.key === tab ? "page" : undefined}
            className="flex min-h-10 flex-none items-center rounded-full px-3 text-[14px] font-semibold sm:px-4 sm:text-[15px] text-muted transition-colors hover:text-ink aria-[current=page]:bg-accent aria-[current=page]:text-surface"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-none items-center justify-end gap-2 border-t border-line pt-2 min-[1080px]:border-t-0 min-[1080px]:border-s min-[1080px]:ps-3 min-[1080px]:pt-0">
        <PeriodPicker
          preset={period.preset}
          from={period.from}
          to={period.to}
          today={today}
          onPreset={(key) => router.push(href({ period: key }))}
          onCustom={(from, to) => router.push(href({ period: "custom", from, to }))}
        />
        <button
          type="button"
          aria-pressed={compare}
          onClick={() => router.push(href({ compare: compare ? "off" : "on" }))}
          className="btn btn-secondary min-h-10 aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:text-accent"
        >
          vs previous
        </button>
      </div>
    </div>
  );
}

/** Reads every report again (the data comes straight from the database). */
export function RefreshButton() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  return (
    <button
      type="button"
      disabled={refreshing}
      onClick={() => startRefresh(() => router.refresh())}
      className="btn btn-primary min-h-11 px-5 text-[15px]"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`size-[15px] fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round] ${refreshing ? "animate-spin" : ""}`}
      >
        <path d="M20 11a8 8 0 1 0-2.3 5.7" />
        <path d="M20 5v6h-6" />
      </svg>
      Refresh
    </button>
  );
}
