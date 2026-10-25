"use client";

import { Icon } from "@/components/admin/icons";
import type { AreaDraft, ZoneDraft } from "./store-settings";
import { DragGrip, useDragOrder } from "./use-drag-order";

export function reorder<T extends { id: string }>(rows: T[], from: string, to: string): T[] {
  const source = rows.findIndex((row) => row.id === from);
  const target = rows.findIndex((row) => row.id === to);
  if (source < 0 || target < 0 || source === target) return rows;
  const next = [...rows];
  next.splice(target, 0, next.splice(source, 1)[0]);
  return next;
}

function ZoneEditor({
  zone,
  zones,
  areas,
  onZone,
  onAreas,
  onRemoveZone,
  onRemoveArea,
  dragHandle,
  dragging,
}: {
  zone: ZoneDraft;
  zones: ZoneDraft[];
  areas: AreaDraft[];
  onZone: (zone: ZoneDraft) => void;
  onAreas: (areas: AreaDraft[]) => void;
  onRemoveZone: () => void;
  onRemoveArea: (id: string) => void;
  dragHandle: ReturnType<typeof useDragOrder>["handle"];
  dragging: boolean;
}) {
  const members = areas.filter((area) => area.zoneId === zone.id);
  const dnd = useDragOrder(
    zone.id,
    members.map((area) => area.id),
    (from, to) => {
      const sorted = reorder(members, from, to);
      let index = 0;
      onAreas(areas.map((area) => (area.zoneId === zone.id ? sorted[index++] : area)));
    },
  );
  const change = (id: string, patch: Partial<AreaDraft>) => {
    const next = areas.map((area) => (area.id === id ? { ...area, ...patch } : area));
    onAreas(
      patch.zoneId
        ? [...next.filter((area) => area.id !== id), next.find((area) => area.id === id)!]
        : next,
    );
  };
  return (
    <section
      aria-label={zone.name || "New zone"}
      data-sort-group="zones"
      data-sort-id={zone.id}
      className={`rounded-xl border border-line p-4 ${dragging ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <button {...dragHandle(zone.id, `zone ${zone.name || "new zone"}`)}>
          <DragGrip />
        </button>
        <label className="min-w-36 flex-1">
          <span className="label">Zone name</span>
          <input
            value={zone.name}
            onChange={(e) => onZone({ ...zone, name: e.target.value })}
            required
            maxLength={60}
            className="field"
          />
        </label>
        <label className="w-32">
          <span className="label">Delivery fee ($)</span>
          <input
            type="number"
            min={0}
            max={1000}
            step={0.01}
            value={zone.fee}
            onChange={(e) => onZone({ ...zone, fee: e.target.value })}
            required
            className="field"
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost text-bad"
          disabled={members.length > 0}
          title={members.length ? "Move this zone’s areas to another zone first" : "Remove zone"}
          aria-label={`Remove ${zone.name}`}
          onClick={onRemoveZone}
        >
          <Icon name="trash" className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-[13px] text-muted">
        {members.length} area{members.length === 1 ? "" : "s"} · Drag to reorder; use the Zone
        selector to move an area.
      </p>
      <p className="sr-only" aria-live="polite">
        {dnd.announcement}
      </p>
      <ul className="mt-1 divide-y divide-line">
        {members.map((area) => (
          <li
            key={area.id}
            data-sort-group={zone.id}
            data-sort-id={area.id}
            className={`py-3 ${dnd.dragging === area.id ? "rounded-lg bg-accent-soft ring-2 ring-accent" : ""}`}
          >
            <div className="flex items-end gap-2">
              <button {...dnd.handle(area.id, `area ${area.nameEn || "new area"}`)}>
                <DragGrip />
              </button>
              <div className="grid min-w-0 flex-1 grid-cols-2 items-end gap-2 xl:grid-cols-[1fr_1fr_9rem_auto_auto]">
                <label className="min-w-0">
                  <span className="label">Area in English</span>
                  <input
                    value={area.nameEn}
                    onChange={(e) => change(area.id, { nameEn: e.target.value })}
                    required
                    maxLength={60}
                    placeholder="Mina"
                    className="field"
                  />
                </label>
                <label className="min-w-0">
                  <span className="label">In Arabic</span>
                  <input
                    value={area.nameAr}
                    onChange={(e) => change(area.id, { nameAr: e.target.value })}
                    lang="ar"
                    dir="rtl"
                    required
                    maxLength={60}
                    placeholder="الميناء"
                    className="field"
                  />
                </label>
                <label className="min-w-0">
                  <span className="label">Zone</span>
                  <select
                    value={area.zoneId}
                    onChange={(e) => change(area.id, { zoneId: e.target.value })}
                    className="field"
                  >
                    {zones.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.name || "New zone"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-9 items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={area.active}
                    onChange={(e) => change(area.id, { active: e.target.checked })}
                    className="size-4 accent-accent"
                  />
                  On
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-fit px-1.5 text-bad"
                  aria-label={`Remove ${area.nameEn || "new area"}`}
                  onClick={() => onRemoveArea(area.id)}
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-3"
        onClick={() =>
          onAreas([
            ...areas,
            { id: crypto.randomUUID(), zoneId: zone.id, nameEn: "", nameAr: "", active: true },
          ])
        }
      >
        <Icon name="plus" className="size-4" />
        Add area
      </button>
    </section>
  );
}

export function DeliveryZones({
  zones,
  areas,
  onZones,
  onAreas,
  onRemoveZone,
  onRemoveArea,
}: {
  zones: ZoneDraft[];
  areas: AreaDraft[];
  onZones: (zones: ZoneDraft[]) => void;
  onAreas: (areas: AreaDraft[]) => void;
  onRemoveZone: (id: string) => void;
  onRemoveArea: (id: string) => void;
}) {
  const dnd = useDragOrder(
    "zones",
    zones.map((zone) => zone.id),
    (from, to) => onZones(reorder(zones, from, to)),
  );
  const addZone = () => {
    let index = 0;
    let name: string;
    do {
      name = `Zone ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`;
      index++;
    } while (zones.some((zone) => zone.name.toLowerCase() === name.toLowerCase()));
    onZones([...zones, { id: crypto.randomUUID(), name, fee: "2.00" }]);
  };
  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">Delivery zones</h2>
      <p className="mt-1 text-sm text-muted">
        Set one fee per zone. Customers see only the areas that are on, in one list. All changes
        apply when you save the Store page.
      </p>
      <p id="drag-order-help" className="sr-only">
        Drag the handle to reorder, or focus it and use the Up and Down arrow keys.
      </p>
      <p className="sr-only" aria-live="polite">
        {dnd.announcement}
      </p>
      <div className="mt-5 flex flex-col gap-5">
        {zones.map((zone) => (
          <ZoneEditor
            key={zone.id}
            zone={zone}
            zones={zones}
            areas={areas}
            onZone={(value) => onZones(zones.map((row) => (row.id === value.id ? value : row)))}
            onAreas={onAreas}
            onRemoveZone={() => onRemoveZone(zone.id)}
            onRemoveArea={onRemoveArea}
            dragHandle={dnd.handle}
            dragging={dnd.dragging === zone.id}
          />
        ))}
      </div>
      {zones.length === 0 && (
        <p className="mt-4 text-muted">Add a zone and its fee, then add the areas it covers.</p>
      )}
      <button type="button" className="btn btn-secondary mt-4" onClick={addZone}>
        <Icon name="plus" className="size-4" />
        Add zone
      </button>
    </section>
  );
}
