"use client";

import { useState, useTransition, type FormEvent } from "react";
import { type FormState, idle } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { tabBarClass, tabClass } from "@/components/admin/page-tabs";
import { SaveBar, useUnsavedGuard } from "@/components/admin/save-bar";
import { alphabetical } from "@/lib/alphabetical";
import { storeStatus, type Ordering, type Schedule } from "@/lib/hours";
import { saveStoreSettings, setOrdering } from "./actions";
import { DeliveryZones } from "./delivery-zones";
import { AlertsForm, ClosuresCard, HoursForm, TimesForm, type AlertRow } from "./forms";
import { orderingNote } from "./ordering-note";
import { OrderingSwitch } from "./ordering-switch";
import { parseStoreSettings, type StoreDraft } from "./store-settings";

const sections = [
  { key: "hours", label: "Hours" },
  { key: "delivery", label: "Delivery" },
  { key: "alerts", label: "Alerts" },
] as const;

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
  const [section, setSection] = useState<(typeof sections)[number]["key"]>("hours");
  const [switching, startSwitching] = useTransition();
  const [switchError, setSwitchError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== baseline;
  useUnsavedGuard(dirty);
  const change = (patch: Partial<StoreDraft>) => {
    setStatus(idle);
    setDraft((value) => ({ ...value, ...patch }));
  };
  /** The ordering switch saves by itself, whatever else is waiting to be saved. */
  const switchOrdering = (ordering: Ordering) => {
    const apply = (value: Ordering) => {
      setDraft((current) => ({ ...current, ordering: value }));
      setBaseline((saved) => JSON.stringify({ ...JSON.parse(saved), ordering: value }));
    };
    const before = draft.ordering;
    setSwitchError(null);
    apply(ordering);
    startSwitching(async () => {
      const { error } = await setOrdering(draft.branchId, ordering);
      if (error) {
        apply(before);
        setSwitchError(error);
      }
    });
  };
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
          const clean = {
            ...draft,
            zones: alphabetical(draft.zones, (zone) => zone.name),
            areas: alphabetical(draft.areas, (area) => area.nameEn),
            removedZoneIds: [],
            removedAreaIds: [],
            removedClosureIds: [],
          };
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
      <PageHeader title="Store" />
      <div className="mb-6">
        <OrderingSwitch
          value={draft.ordering}
          open={storeStatus(schedule).open}
          note={orderingNote(schedule)}
          saving={switching}
          error={switchError}
          onChange={switchOrdering}
        />
      </div>

      <div role="tablist" aria-label="Store settings" className={tabBarClass}>
        {sections
          .filter((s) => s.key !== "alerts" || draft.alerts)
          .map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={section === s.key}
              aria-current={section === s.key ? "page" : undefined}
              onClick={() => setSection(s.key)}
              className={tabClass}
            >
              {s.label}
            </button>
          ))}
      </div>

      <fieldset disabled={pending} className="min-w-0">
        {section === "hours" && (
          <div className="grid items-start gap-6 wide:grid-cols-2">
            <div className="flex flex-col gap-6">
              {draft.hours.map((branch) => (
                <HoursForm
                  key={branch.branchId}
                  value={branch}
                  onChange={(value) =>
                    change({
                      hours: draft.hours.map((row) =>
                        row.branchId === value.branchId ? value : row,
                      ),
                    })
                  }
                />
              ))}
            </div>
            <div className="flex flex-col gap-6">
              <TimesForm value={draft} onChange={change} />
              <ClosuresCard
                closures={draft.closures}
                branches={draft.hours.map((branch) => ({
                  id: branch.branchId,
                  name: branch.branchName,
                }))}
                today={today}
                onChange={(closures) => change({ closures })}
                onRemove={(id) =>
                  change({
                    closures: draft.closures.filter((closure) => closure.id !== id),
                    removedClosureIds: [...draft.removedClosureIds, id],
                  })
                }
              />
            </div>
          </div>
        )}
        {section === "delivery" && (
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
        )}
        {section === "alerts" && draft.alerts && (
          <AlertsForm
            value={draft.alerts}
            recent={recent}
            onChange={(alerts) => change({ alerts })}
          />
        )}
      </fieldset>

      <SaveBar
        dirty={dirty}
        pending={pending}
        state={status}
        onDiscard={() => {
          setDraft(JSON.parse(baseline));
          setStatus(idle);
        }}
      />
    </form>
  );
}
