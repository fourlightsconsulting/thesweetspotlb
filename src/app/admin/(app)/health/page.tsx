import type { Metadata } from "next";
import { minutesAgo } from "@/components/admin/format";
import { PageHeader } from "@/components/admin/page-header";
import { PageTabs } from "@/components/admin/page-tabs";
import { adminClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { needsAttention } from "@/server/admin/health";
import { requireStaff } from "@/server/admin/session";
import { ConnectionsTab } from "./connections";
import { type Bucket, bucketLabels } from "./labels";
import { HealthOverviewTab, websiteSetup } from "./overview";
import {
  problemGroupKey,
  problemRanges,
  problemsHref,
  ProblemsTab,
  ProblemVisits,
} from "./problems";
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
const visitsPerPage = 25;
type Db = Awaited<ReturnType<typeof adminClient>>;
type SearchParams = Awaited<PageProps<"/admin/health">["searchParams"]>;

async function Problems({ db, params }: { db: Db; params: SearchParams }) {
  const range = problemRanges.find((r) => r.key === one(params.range)) ?? problemRanges[1];
  const bucketParam = one(params.bucket);
  const bucket =
    bucketParam && Object.hasOwn(bucketLabels, bucketParam) ? (bucketParam as Bucket) : null;
  const groupKey = one(params.group);
  const now = Date.parse(minutesAgo(0));
  const requestedEnd = Date.parse(one(params.until) ?? "");
  const end = groupKey && requestedEnd >= 0 && requestedEnd <= now ? requestedEnd : now;
  const periodEnd = new Date(end).toISOString();
  const period = {
    p_from: new Date(end - range.hours * 3_600_000).toISOString(),
    p_to: periodEnd,
  };
  const { data, error } = await db.rpc("health_problems", period);
  if (error) throw new Error(`health_problems failed: ${error.message}`);
  const report = data as HealthProblems;
  const group = groupKey
    ? report.groups.find((g) => (!bucket || g.bucket === bucket) && problemGroupKey(g) === groupKey)
    : undefined;

  if (!groupKey || !group)
    return (
      <ProblemsTab
        data={report}
        range={range.key}
        bucket={bucket}
        periodEnd={periodEnd}
        groupMissing={Boolean(groupKey)}
      />
    );

  const requestedPage = Number(one(params.page));
  const lastPage = Math.max(1, Math.ceil(group.visits / visitsPerPage));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 1
      ? Math.min(requestedPage, lastPage)
      : 1;
  const offset = (page - 1) * visitsPerPage;
  const { data: visits, error: visitsError } = await db
    .rpc("health_problem_visits", {
      ...period,
      p_bucket: group.bucket,
      p_event: group.event,
      p_detail: group.detail,
      p_handled: group.handled,
    })
    .order("last_at", { ascending: false })
    .order("visit_id")
    .range(offset, offset + visitsPerPage);
  if (visitsError) throw new Error(`health_problem_visits failed: ${visitsError.message}`);
  const pageHref = (number: number) =>
    problemsHref(range.key, bucket, {
      group: groupKey,
      until: periodEnd,
      page: number === 1 ? null : String(number),
    });

  return (
    <ProblemVisits
      group={group}
      visits={visits.slice(0, visitsPerPage)}
      rangeLabel={range.label}
      backHref={problemsHref(range.key, bucket)}
      previousHref={page > 1 ? pageHref(page - 1) : null}
      nextHref={visits.length > visitsPerPage ? pageHref(page + 1) : null}
    />
  );
}

export default async function HealthPage({ searchParams }: PageProps<"/admin/health">) {
  await requireStaff("manager");
  const params = await searchParams;
  const tab = tabs.find((t) => t.key === one(params.tab))?.key ?? "overview";
  const db = await adminClient();

  let body: React.ReactNode;
  if (tab === "problems") {
    body = <Problems db={db} params={params} />;
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
      <PageTabs
        label="Health"
        tabs={tabs.map((t) => ({
          href: t.key === "overview" ? "/admin/health" : `/admin/health?tab=${t.key}`,
          label: t.label,
        }))}
        current={tab === "overview" ? "/admin/health" : `/admin/health?tab=${tab}`}
      />
      {body}
    </>
  );
}
