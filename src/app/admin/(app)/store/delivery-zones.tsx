"use client";

import { useState } from "react";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import type { AreaDraft, ZoneDraft } from "./store-settings";

/** One area per row from 1024px up, under a single row of column names. */
const areaColumns =
  "grid grid-cols-2 items-center gap-2 wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_3.5rem_2rem]";

function ZoneEditor({
  zone,
  zones,
  areas,
  startOpen,
  onZone,
  onAreas,
  onRemoveZone,
  onRemoveArea,
}: {
  zone: ZoneDraft;
  zones: ZoneDraft[];
  areas: AreaDraft[];
  startOpen: boolean;
  onZone: (zone: ZoneDraft) => void;
  onAreas: (areas: AreaDraft[]) => void;
  onRemoveZone: () => void;
  onRemoveArea: (id: string) => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const members = areas.filter((area) => area.zoneId === zone.id);
  const change = (id: string, patch: Partial<AreaDraft>) => {
    onAreas(areas.map((area) => (area.id === id ? { ...area, ...patch } : area)));
  };
  return (
    <li aria-label={zone.name || "New zone"} className="rounded-[12px] border border-line">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} the areas in ${zone.name}`}
          onClick={() => setOpen(!open)}
          className="btn btn-ghost btn-sm px-1.5"
        >
          <Icon
            name="chevron"
            className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </button>
        <input
          value={zone.name}
          onChange={(e) => onZone({ ...zone, name: e.target.value })}
          required
          maxLength={60}
          aria-label="Zone name"
          className="field max-w-56 min-w-36 flex-1 font-semibold"
        />
        <div className="relative w-28">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            type="number"
            min={0}
            max={1000}
            step={0.01}
            value={zone.fee}
            onChange={(e) => onZone({ ...zone, fee: e.target.value })}
            required
            aria-label={`Delivery fee for ${zone.name}`}
            className="field ps-6 tabular-nums"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="me-auto text-[13px] text-muted hover:text-ink"
        >
          {members.length} area{members.length === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm px-1.5 text-bad"
          disabled={members.length > 0}
          title={members.length ? "Move this zone’s areas to another zone first" : "Remove zone"}
          aria-label={`Remove ${zone.name}`}
          onClick={onRemoveZone}
        >
          <Icon name="trash" className="size-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-line px-4 py-3">
          {members.length > 0 && (
            <div
              className={`${areaColumns} hidden border-b border-line pb-2 text-[12px] font-semibold text-muted wide:grid`}
            >
              <span>Area</span>
              <span>In Arabic</span>
              <span>Zone</span>
              <span>On</span>
              <span />
            </div>
          )}
          <ul className="divide-y divide-line">
            {members.map((area) => (
              <li key={area.id} className={`${areaColumns} py-2`}>
                <input
                  value={area.nameEn}
                  onChange={(e) => change(area.id, { nameEn: e.target.value })}
                  required
                  maxLength={60}
                  aria-label="Area"
                  placeholder="Mina"
                  className="field"
                />
                <input
                  value={area.nameAr}
                  onChange={(e) => change(area.id, { nameAr: e.target.value })}
                  lang="ar"
                  dir="rtl"
                  required
                  maxLength={60}
                  aria-label="Area in Arabic"
                  placeholder="الميناء"
                  className="field"
                />
                <select
                  value={area.zoneId}
                  onChange={(e) => change(area.id, { zoneId: e.target.value })}
                  aria-label={`Zone for ${area.nameEn}`}
                  className="field"
                >
                  {zones.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.name || "New zone"}
                    </option>
                  ))}
                </select>
                <input
                  type="checkbox"
                  checked={area.active}
                  onChange={(e) => change(area.id, { active: e.target.checked })}
                  aria-label={`${area.nameEn} on`}
                  className="size-4 accent-accent"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-fit justify-self-end px-1.5 text-bad"
                  aria-label={`Remove ${area.nameEn || "new area"}`}
                  onClick={() => onRemoveArea(area.id)}
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-2"
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
        </div>
      )}
    </li>
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
  // Zones added since the page opened start open, ready for their areas.
  const [knownZones] = useState(() => new Set(zones.map((zone) => zone.id)));
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">
          Delivery zones
          <Help>
            One fee per zone. Customers see the areas that are on, alphabetically in their language.
            To move an area, change its zone.
          </Help>
        </h2>
        <button type="button" className="btn btn-secondary" onClick={addZone}>
          <Icon name="plus" className="size-4" />
          Add zone
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {zones.map((zone) => (
          <ZoneEditor
            key={zone.id}
            zone={zone}
            zones={zones}
            areas={areas}
            startOpen={!knownZones.has(zone.id)}
            onZone={(value) => onZones(zones.map((row) => (row.id === value.id ? value : row)))}
            onAreas={onAreas}
            onRemoveZone={() => onRemoveZone(zone.id)}
            onRemoveArea={onRemoveArea}
          />
        ))}
      </ul>
      {zones.length === 0 && <p className="mt-4 text-muted">No zones yet.</p>}
    </section>
  );
}
