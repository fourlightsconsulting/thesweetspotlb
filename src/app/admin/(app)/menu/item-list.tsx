"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { money } from "@/components/admin/format";
import { Icon } from "@/components/admin/icons";
import { Switch } from "@/components/admin/switch";
import { moveItem, setItemAvailable } from "./actions";
import type { AdminCategory, AdminItem } from "./data";

const tagLabels = { fav: "Favourite", new: "New", limited: "Limited" } as const;

type Section = { category: AdminCategory; heading?: AdminCategory; items: AdminItem[] };

type Props = {
  sections: Section[];
  canEdit: boolean;
  /** Where an item's edit page lives ("/admin/menu/items" or "/admin/bundles"). */
  editBase: string;
};

/** The menu by category: sold-out switches for everyone, editing for managers. */
export function ItemList({ sections, canEdit, editBase }: Props) {
  const [query, setQuery] = useState("");
  const [soldOutOnly, setSoldOutOnly] = useState(false);
  const q = query.trim().toLowerCase();
  const visible = sections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => (!q || i.nameEn.toLowerCase().includes(q)) && (!soldOutOnly || !i.available),
      ),
    }))
    .filter((s) => s.items.length > 0 || (!q && !soldOutOnly));
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const soldOut = sections.reduce((n, s) => n + s.items.filter((i) => !i.available).length, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Icon
            name="search"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an item"
            aria-label="Find an item"
            className="field ps-9"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={soldOutOnly}
            onChange={(e) => setSoldOutOnly(e.target.checked)}
            className="size-4 accent-accent"
          />
          Sold out only ({soldOut})
        </label>
        <span className="ms-auto text-[13px] text-muted">{total} items</span>
      </div>

      <div className="flex flex-col gap-6">
        {visible.map((section) => (
          <section key={(section.heading ?? section.category).id}>
            <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-muted uppercase">
              {section.category.nameEn}
              {section.heading && <span>› {section.heading.nameEn}</span>}
              {!(section.heading ?? section.category).active && (
                <span className="pill normal-case">Hidden</span>
              )}
            </h2>
            {section.items.length === 0 ? (
              <p className="card px-4 py-3 text-muted">No items yet.</p>
            ) : (
              <ul className="card divide-y divide-line">
                {section.items.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    canMove={canEdit && !q && !soldOutOnly}
                    first={i === 0}
                    last={i === section.items.length - 1}
                    editBase={editBase}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
        {visible.length === 0 && <p className="text-muted">Nothing matches.</p>}
      </div>
    </>
  );
}

function ItemRow({
  item,
  canEdit,
  canMove,
  first,
  last,
  editBase,
}: {
  item: AdminItem;
  canEdit: boolean;
  canMove: boolean;
  first: boolean;
  last: boolean;
  editBase: string;
}) {
  const [available, setAvailable] = useOptimistic(item.available);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (next: boolean) =>
    startBusy(async () => {
      setAvailable(next);
      setError((await setItemAvailable(item.id, next)).error);
    });
  const move = (direction: "up" | "down") =>
    startBusy(async () => setError((await moveItem(item.id, direction)).error));

  const name = canEdit ? (
    <Link href={`${editBase}/${item.id}`} className="font-semibold hover:text-accent">
      {item.nameEn}
    </Link>
  ) : (
    <span className="font-semibold">{item.nameEn}</span>
  );

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="relative size-11 flex-none overflow-hidden rounded-[10px] bg-cotton-candy">
        {item.imageSrc && (
          <Image src={item.imageSrc} alt="" fill sizes="44px" className="object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate">{name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <span className="tabular-nums">{money(item.price)}</span>
          {item.tag && <span className="pill">{tagLabels[item.tag]}</span>}
          {!item.active && <span className="pill bg-bad-soft text-bad">Hidden</span>}
          {item.active && !item.online && <span className="pill">In shop only</span>}
        </p>
        {error && <p className="text-[13px] text-bad">{error}</p>}
      </div>
      {canMove && (
        <div className="hidden flex-none sm:flex">
          <button
            type="button"
            aria-label={`Move ${item.nameEn} up`}
            disabled={first || busy}
            onClick={() => move("up")}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="up" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Move ${item.nameEn} down`}
            disabled={last || busy}
            onClick={() => move("down")}
            className="btn btn-ghost btn-sm px-1.5"
          >
            <Icon name="down" className="size-4" />
          </button>
        </div>
      )}
      <label className="flex flex-none items-center gap-2 text-[13px]">
        <span className={available ? "text-muted" : "font-semibold text-bad"}>
          {available ? "Available" : "Sold out"}
        </span>
        <Switch
          checked={available}
          onChange={toggle}
          label={`${item.nameEn} available`}
          disabled={busy}
        />
      </label>
    </li>
  );
}
