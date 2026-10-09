import Link from "next/link";
import { AttentionList } from "@/components/admin/attention-list";
import { Panel } from "@/components/admin/charts";
import { Icon } from "@/components/admin/icons";
import { tags } from "@/lib/tracking/config";
import { serviceClient } from "@/lib/supabase/service";
import type { Attention } from "@/server/admin/attention";
import { metaCapiConfigured } from "@/server/meta-capi";
import { whatsappConfig } from "@/server/whatsapp";
import { cronRows, healthCards, importRows, type Setup, setupRows } from "./cards";
import { type Status, statusLabels } from "./status";
import type { HealthOverview } from "./types";

function StatusPill({ status, text }: { status: Status; text?: string }) {
  const label = statusLabels[status];
  return <span className={`pill whitespace-nowrap ${label.tone}`}>{text ?? label.text}</span>;
}

/** Which settings the website has: whether each is set, never its value. */
export function websiteSetup(): Setup {
  return {
    ordersSave: serviceClient() !== null,
    whatsapp: whatsappConfig() !== null,
    metaPixel: tags.metaPixelId !== "",
    metaCapi: metaCapiConfigured(),
    ga4: tags.ga4Id !== "",
    googleAds: tags.adsId !== "" && tags.adsPurchaseLabel !== "",
  };
}

/** Is everything working: one card per part, then imports, jobs and setup. */
export function HealthOverviewTab({
  data,
  attention,
  setup,
}: {
  data: HealthOverview;
  attention: Attention;
  setup: Setup;
}) {
  const cards = healthCards(data, setup);
  const checklist = setupRows(data, setup);
  const connected = checklist.filter((row) => row.done).length;

  return (
    <div className="flex flex-col gap-6">
      {attention.length > 0 ? (
        <AttentionList items={attention} />
      ) : (
        <p className="card flex items-center gap-2 p-4 font-semibold">
          <Icon name="check" className="size-5 text-accent" />
          Nothing needs attention right now.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 wide:grid-cols-3">
        {cards.map((card) => (
          <section key={card.key} className="card flex flex-col gap-2 p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold">{card.title}</h2>
              <StatusPill status={card.status} />
            </div>
            <ul className="flex flex-1 flex-col gap-1 text-[13px]">
              {card.lines.map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
            {card.link && (
              <Link href={card.href} className="text-[13px] font-semibold text-accent">
                {card.link} →
              </Link>
            )}
          </section>
        ))}
      </div>

      <Panel
        title="What’s connected"
        note={`${connected} of ${checklist.length} in place. Website settings are set in Cloudflare (those starting NEXT_PUBLIC_ need a new build); import secrets in Supabase.`}
      >
        <ul className="-mx-5 divide-y divide-line">
          {checklist.map((row) => (
            <li key={row.name} className="flex items-start gap-3 px-5 py-2.5">
              <span
                className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full ${row.done ? "bg-accent-soft text-accent" : "bg-tint text-muted"}`}
              >
                {row.done ? <Icon name="check" className="size-3.5" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{row.name}</span>
                <span className="block text-[13px] break-words text-muted">{row.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel title="Imported numbers" note="The latest day each source has brought in">
          <Table
            head={["Source", "Latest day", "Last run", ""]}
            rows={importRows(data).map((row) => [
              row.name,
              row.latest,
              row.lastRun,
              <StatusPill key="s" status={row.status} />,
            ])}
          />
          <Link
            href="/admin/connections"
            className="mt-3 inline-block text-[13px] font-semibold text-accent"
          >
            Connections →
          </Link>
        </Panel>
        <Panel title="Scheduled jobs" note="What runs on its own, and how it went last time">
          <Table
            head={["Job", "When", "Last run", "Result"]}
            rows={cronRows(data).map((row) => [
              row.name,
              row.schedule,
              row.lastRun,
              <span key="r" className="inline-flex items-center gap-2">
                <span
                  className={`size-2 flex-none rounded-full ${row.status === "bad" ? "bg-bad" : row.status === "off" ? "bg-line" : "bg-accent"}`}
                />
                <span className="max-w-[14rem] truncate" title={row.result}>
                  {row.result}
                </span>
              </span>,
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}

/** A compact table whose last column may hold a pill. */
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[420px] text-[13px]">
        <thead className="text-[12px] text-muted">
          <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:text-start [&>th]:font-semibold">
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i} className="[&>td]:px-5 [&>td]:py-2 [&>td]:align-middle">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={j === 0 ? "font-semibold" : "whitespace-nowrap tabular-nums"}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
