import type { Metadata } from "next";
import Link from "next/link";
import { minutesAgo } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { adminClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { needsAttention } from "@/server/admin/health";
import { requireStaff } from "@/server/admin/session";
import { ConnectionsTab } from "./connections";
import { type Bucket, bucketLabels } from "./labels";
import { HealthOverviewTab, websiteSetup } from "./overview";
import { type ProblemRange, problemRanges, ProblemsTab } from "./problems";
import type { HealthOverview, HealthProblems } from "./types";
import { VisitTab } from "./visit";

export const metadata: Metadata = { title: "Health" };

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "problems", label: "Problems" },
  { key: "visit", label: "Visit trail" },
  { key: "connections", label: "Connections" },
] as const;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function HealthPage({ searchParams }: PageProps<"/admin/health">) {
  await requireStaff("manager");
  const params = await searchParams;
  const tab = tabs.find((t) => t.key === one(params.tab))?.key ?? "overview";
  const db = await adminClient();

  let body: React.ReactNode;
  if (tab === "problems") {
    const range = problemRanges.find((r) => r.key === one(params.range)) ?? problemRanges[1];
    const bucketParam = one(params.bucket);
    const bucket = bucketParam && bucketParam in bucketLabels ? (bucketParam as Bucket) : null;
    const { data, error } = await db.rpc("health_problems", {
      p_from: minutesAgo(range.hours * 60),
      p_to: minutesAgo(-1),
    });
    if (error) throw new Error(`health_problems failed: ${error.message}`);
    body = (
      <ProblemsTab
        data={data as HealthProblems}
        range={range.key as ProblemRange}
        bucket={bucket}
      />
    );
  } else if (tab === "visit") {
    body = <VisitTab db={db} visit={one(params.visit)?.slice(0, 64) || null} />;
  } else if (tab === "connections") {
    body = <ConnectionsTab />;
  } else {
    // Fill in job runs that finished since the scheduler last looked.
    await serviceClient()?.rpc("reconcile_jobs");
    const [{ data, error }, attention] = await Promise.all([
      db.rpc("health_overview"),
      needsAttention(),
    ]);
    if (error) throw new Error(`health_overview failed: ${error.message}`);
    body = (
      <HealthOverviewTab
        data={data as HealthOverview}
        attention={attention}
        setup={websiteSetup()}
      />
    );
  }

  return (
    <>
      <PageHeader title="Health" />
      <nav aria-label="Health" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? "/admin/health" : `/admin/health?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className="-mb-px border-b-2 border-transparent px-3 py-2 font-semibold whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
