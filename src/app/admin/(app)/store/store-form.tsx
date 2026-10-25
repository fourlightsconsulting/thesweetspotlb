"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { FormStatus, idle, type FormState } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { storeStatus, type Schedule } from "@/lib/hours";
import { saveStoreSettings } from "./actions";
import { DeliveryZones } from "./delivery-zones";
import { AlertsForm, ClosuresCard, HoursForm, TimesForm, type AlertRow } from "./forms";
import { orderingNote } from "./ordering-note";
import { OrderingSwitch } from "./ordering-switch";
import { parseStoreSettings, type StoreDraft } from "./store-settings";

export function StoreForm({
  initial,
  recent,
  today,
}: {
  initial: StoreDraft;
  recent: AlertRow[];
  today: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [status, setStatus] = useState<FormState>(idle);
  const [pending, startSaving] = useTransition();
  const dirty = JSON.stringify(draft) !== baseline;
  const change = (patch: Partial<StoreDraft>) => {
    setStatus(idle);
    setDraft((value) => ({ ...value, ...patch }));
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseStoreSettings(draft);
    if (!parsed.ok) {
      setStatus({ status: "error", message: parsed.error });
      return;
    }
    startSaving(async () => {
      try {
        const result = await saveStoreSettings(draft);
        setStatus(result);
        if (result.status === "saved") {
          const clean = { ...draft, removedZoneIds: [], removedAreaIds: [], removedClosureIds: [] };
          setDraft(clean);
          setBaseline(JSON.stringify(clean));
        }
      } catch {
        setStatus({
          status: "error",
          message: "The settings didn’t save. Your edits are still here; try again.",
        });
      }
    });
  };
  const mainHours = draft.hours.find((branch) => branch.branchId === draft.branchId)!;
  const minutes = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };
  const schedule: Schedule = {
    ordering: draft.ordering,
    lastOrderMinutes: Number(mainHours.lastOrderMinutes),
    closures: draft.closures
      .filter((closure) => closure.branchId === draft.branchId)
      .map((closure) => closure.date),
    hours: mainHours.week.map((day) => {
      if (!day.open) return null;
      const open = minutes(day.opens);
      const close = minutes(day.closes);
      return [open, close <= open ? close + 1440 : close];
    }),
  };
  return (
    <form onSubmit={save}>
      <div className="sticky top-0 z-20 bg-canvas/95 pt-2 pb-1 backdrop-blur-sm">
        <PageHeader
          title="Store"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-muted" role="status">
                {pending ? "Saving all changes…" : dirty ? "Unsaved changes" : "All changes saved"}
              </span>
              <button type="submit" className="btn btn-primary" disabled={pending || !dirty}>
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          }
        />
        <div aria-live="polite" className="mb-3">
          <FormStatus state={status} />
        </div>
      </div>
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <OrderingSwitch
          value={draft.ordering}
          open={storeStatus(schedule).open}
          note={orderingNote(schedule)}
          onChange={(ordering) => change({ ordering })}
        />
        <div className="grid gap-6 wide:grid-cols-2">
          <TimesForm value={draft} onChange={change} />
          {draft.alerts && (
            <AlertsForm
              value={draft.alerts}
              recent={recent}
              onChange={(alerts) => change({ alerts })}
            />
          )}
        </div>
        <DeliveryZones
          zones={draft.zones}
          areas={draft.areas}
          onZones={(zones) => change({ zones })}
          onAreas={(areas) => change({ areas })}
          onRemoveZone={(id) =>
            change({
              zones: draft.zones.filter((zone) => zone.id !== id),
              removedZoneIds: [...draft.removedZoneIds, id],
            })
          }
          onRemoveArea={(id) =>
            change({
              areas: draft.areas.filter((area) => area.id !== id),
              removedAreaIds: [...draft.removedAreaIds, id],
            })
          }
        />
        <div className="grid gap-6 wide:grid-cols-2">
          {draft.hours.map((branch) => (
            <HoursForm
              key={branch.branchId}
              value={branch}
              onChange={(value) =>
                change({
                  hours: draft.hours.map((row) => (row.branchId === value.branchId ? value : row)),
                })
              }
            />
          ))}
        </div>
        <ClosuresCard
          closures={draft.closures}
          branches={draft.hours.map((branch) => ({ id: branch.branchId, name: branch.branchName }))}
          today={today}
          onChange={(closures) => change({ closures })}
          onRemove={(id) =>
            change({
              closures: draft.closures.filter((closure) => closure.id !== id),
              removedClosureIds: [...draft.removedClosureIds, id],
            })
          }
        />
      </fieldset>
    </form>
  );
}
