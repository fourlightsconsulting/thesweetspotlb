import { createHash } from "node:crypto";
import Link from "next/link";
import { count, Empty } from "@/components/admin/charts";
import { Help } from "@/components/admin/help";
import { when } from "@/components/admin/format";
import { type Bucket, bucketLabels, handledLabels, problemTitle } from "./labels";
import type { HealthProblems, ProblemGroup, ProblemVisit } from "./types";

const deviceNames: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
};

export const visitHref = (visit: string) =>
  `/admin/health?tab=visit&visit=${encodeURIComponent(visit)}`;

export function problemGroupKey(group: ProblemGroup) {
  return createHash("sha256")
    .update(JSON.stringify([group.bucket, group.event, group.detail, group.handled]))
    .digest("hex");
}

/** What else is known about a group: codes typed, pages, scripts, browsers. */
function details(group: ProblemGroup) {
  const parts: string[] = [];
  if (group.handled) parts.push(handledLabels[group.handled] ?? group.handled);
  if (group.codes?.length) parts.push(`Typed: ${group.codes.join(", ")}`);
  if (group.event !== "not_found" && group.pages?.length)
    parts.push(`On ${group.pages.join(", ")}`);
  if (group.sources?.length) parts.push(`From ${group.sources.join(", ")}`);
  if (group.browsers?.length) parts.push(group.browsers.join(", "));
  return parts.join(" · ");
}

function GroupList({
  groups,
  visitsHref,
}: {
  groups: ProblemGroup[];
  visitsHref: (group: ProblemGroup) => string;
}) {
  return (
    <ul className="-mx-5 divide-y divide-line">
      {groups.map((group) => (
        <li
          key={`${group.bucket}:${group.event}:${group.detail}:${group.handled}`}
          className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3"
        >
          <div className="min-w-0 flex-[1_1_16rem]">
            <p className="font-semibold break-words">{problemTitle(group.event, group.detail)}</p>
            <p className="text-[13px] break-words text-muted">{details(group)}</p>
          </div>
          <div className="text-[13px] tabular-nums">
            <p>
              {count(group.times)} {group.times === 1 ? "time" : "times"} · {count(group.visits)}{" "}
              {group.visits === 1 ? "visit" : "visits"}
            </p>
            <p className="text-muted">Last {when(group.last_seen)}</p>
          </div>
          {group.latest_visit && (
            <Link
              href={group.visits > 1 ? visitsHref(group) : visitHref(group.latest_visit)}
              prefetch={false}
              className="self-center text-[13px] font-semibold whitespace-nowrap text-accent"
            >
              {group.visits > 1 ? "All visits →" : "View visit →"}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export const problemRanges = [
  { key: "24h", label: "Last 24 hours", hours: 24 },
  { key: "7d", label: "Last 7 days", hours: 24 * 7 },
  { key: "30d", label: "Last 30 days", hours: 24 * 30 },
] as const;

export type ProblemRange = (typeof problemRanges)[number]["key"];

export function problemsHref(
  range: ProblemRange,
  bucket: Bucket | null,
  changes: Record<string, string | null> = {},
) {
  const params = new URLSearchParams({ tab: "problems", range });
  if (bucket) params.set("bucket", bucket);
  for (const [key, value] of Object.entries(changes))
    if (value === null) params.delete(key);
    else params.set(key, value);
  return `/admin/health?${params}`;
}

function VisitList({ visits }: { visits: ProblemVisit[] }) {
  if (visits.length === 0) return <Empty>None in this period.</Empty>;

  return (
    <ul className="-mx-5 mt-3 divide-y divide-line text-[13px]">
      {visits.map((v) => (
        <li key={v.visit_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2">
          <span className="w-32 tabular-nums">{when(v.last_at)}</span>
          <span className="flex-1">
            {v.problems} {v.problems === 1 ? "problem" : "problems"}
            {v.attention && <span className="pill ms-2 bg-bad-soft text-bad">broken</span>}
          </span>
          <span className="text-muted">
            {[deviceNames[v.device ?? ""], v.browser, v.os].filter(Boolean).join(" · ")}
          </span>
          <Link href={visitHref(v.visit_id)} prefetch={false} className="font-semibold text-accent">
            Open →
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProblemVisits({
  group,
  visits,
  rangeLabel,
  backHref,
  previousHref,
  nextHref,
}: {
  group: ProblemGroup;
  visits: ProblemVisit[];
  rangeLabel: string;
  backHref: string;
  previousHref: string | null;
  nextHref: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link href={backHref} className="self-start text-[13px] font-semibold text-accent">
        ← Back to problems
      </Link>
      <section className="card p-5">
        <h2 className="text-base font-bold break-words">
          {problemTitle(group.event, group.detail)}
        </h2>
        <p className="text-[13px] break-words text-muted">{details(group)}</p>
        <p className="mt-2 text-[13px] text-muted">
          {count(group.visits)} {group.visits === 1 ? "visit" : "visits"} · {rangeLabel}
        </p>
        <VisitList visits={visits} />
        {(previousHref || nextHref) && (
          <nav aria-label="Visit pages" className="mt-4 flex flex-wrap gap-2">
            {previousHref && (
              <Link href={previousHref} prefetch={false} className="btn btn-secondary">
                ← Previous visits
              </Link>
            )}
            {nextHref && (
              <Link href={nextHref} prefetch={false} className="btn btn-secondary">
                More visits →
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

/** The website's problems in a period, grouped, worst first. */
export function ProblemsTab({
  data,
  range,
  bucket,
  periodEnd,
  groupMissing = false,
}: {
  data: HealthProblems;
  range: ProblemRange;
  bucket: Bucket | null;
  periodEnd: string;
  groupMissing?: boolean;
}) {
  const buckets = (Object.keys(bucketLabels) as Bucket[]).filter((b) => !bucket || b === bucket);
  const href = (changes: Record<string, string | null>) => problemsHref(range, bucket, changes);

  return (
    <div className="flex flex-col gap-6">
      {groupMissing && <p role="status">That problem is no longer in this report.</p>}
      <div className="flex flex-wrap gap-2">
        {problemRanges.map((r) => (
          <Link
            key={r.key}
            href={href({ range: r.key })}
            aria-current={r.key === range ? "page" : undefined}
            className="btn btn-secondary min-h-[36px] py-1.5 aria-[current=page]:border-accent aria-[current=page]:text-accent"
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(bucketLabels) as Bucket[]).map((b) => (
          <Link
            key={b}
            href={href({ bucket: bucket === b ? null : b })}
            aria-current={bucket === b ? "true" : undefined}
            className="card flex flex-col gap-1 p-4 hover:border-accent aria-[current=true]:border-accent"
          >
            <span className="text-[13px] text-muted">{bucketLabels[b].title}</span>
            <span
              className={`text-2xl leading-8 font-bold tabular-nums ${b === "attention" && data.counts[b] ? "text-bad" : ""}`}
            >
              {count(data.counts[b])}
            </span>
          </Link>
        ))}
      </div>

      {buckets.map((b) => {
        const groups = data.groups.filter((g) => g.bucket === b);
        return (
          <section key={b} className="card p-5">
            <h2 className="text-base font-bold">
              {bucketLabels[b].title}
              <Help>{bucketLabels[b].note}</Help>
            </h2>
            <div className="mt-3">
              {groups.length ? (
                <GroupList
                  groups={groups}
                  visitsHref={(group) => href({ group: problemGroupKey(group), until: periodEnd })}
                />
              ) : (
                <Empty>None in this period.</Empty>
              )}
            </div>
          </section>
        );
      })}

      <section className="card p-5">
        <h2 className="text-base font-bold">Visits that hit a problem</h2>
        <VisitList visits={data.visits} />
      </section>
    </div>
  );
}
