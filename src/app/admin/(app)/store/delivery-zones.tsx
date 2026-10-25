"use client";

import { Icon } from "@/components/admin/icons";
import type { AreaDraft, ZoneDraft } from "./store-settings";

function ZoneEditor({
  zone,
  zones,
  areas,
  onZone,
  onAreas,
  onRemoveZone,
  onRemoveArea,
}: {
  zone: ZoneDraft;
  zones: ZoneDraft[];
  areas: AreaDraft[];
  onZone: (zone: ZoneDraft) => void;
  onAreas: (areas: AreaDraft[]) => void;
  onRemoveZone: () => void;
  onRemoveArea: (id: string) => void;
}) {
  const members = areas.filter((area) => area.zoneId === zone.id);
  const change = (id: string, patch: Partial<AreaDraft>) => {
    onAreas(areas.map((area) => (area.id === id ? { ...area, ...patch } : area)));
  };
  return (
    <section aria-label={zone.name || "New zone"} className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-end gap-3">
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
        {members.length} area{members.length === 1 ? "" : "s"} · Use the Zone selector to move an
        area.
      </p>
      <ul className="mt-1 divide-y divide-line">
        {members.map((area) => (
          <li key={area.id} className="py-3">
            <div className="flex items-end gap-2">
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
        Set one fee per zone. Customers see the active areas alphabetically in their language. Zones
        and areas are alphabetised here after saving or refreshing. All changes apply when you save
        the Store page.
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
