"use client";

import { useOptimistic, useTransition } from "react";
import { Help } from "@/components/admin/help";
import { Switch } from "@/components/admin/switch";
import { saveTracking } from "./connection-actions";

const FREE_PLAN_BYTES = 500 * 1024 * 1024;

const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/** Website analytics: the switch, and how full the database is. */
export function TrackingCard({
  firstParty,
  usage,
}: {
  firstParty: boolean;
  usage: { databaseBytes: number; eventsBytes: number; events: number } | null;
}) {
  const [on, setOn] = useOptimistic(firstParty);
  const [saving, startSaving] = useTransition();
  const share = usage ? Math.min(1, usage.databaseBytes / FREE_PLAN_BYTES) : 0;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">
            Website analytics
            <Help>
              Records what visitors do (pages, items, carts, orders) for the reports. Switch it off
              if the database gets close to full: orders, the menu and the ad platforms keep
              working.
            </Help>
          </h2>
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={on}
            disabled={saving}
            onChange={(next) =>
              startSaving(async () => {
                setOn(next);
                await saveTracking(next);
              })
            }
            label="Record visitor activity"
          />
          {on ? "Recording" : "Off"}
        </label>
      </div>

      {usage && (
        <div className="mt-4">
          <div className="flex justify-between text-[13px]">
            <span>
              Database: <span className="font-semibold">{megabytes(usage.databaseBytes)}</span> of
              500 MB (free plan)
            </span>
            <span className="text-muted">
              Visitor records: {megabytes(usage.eventsBytes)} · {usage.events.toLocaleString("en")}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tint">
            <div
              className={`h-full rounded-full ${share > 0.8 ? "bg-bad" : share > 0.6 ? "bg-wait" : "bg-accent"}`}
              style={{ width: `${Math.max(2, share * 100)}%` }}
            />
          </div>
          {share > 0.8 && (
            <p className="mt-2 text-[13px] text-bad">
              Nearly full: at 500 MB the database stops taking orders. Switch visitor records off,
              or move to Supabase Pro.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
