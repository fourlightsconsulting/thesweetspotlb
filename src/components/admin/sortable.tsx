"use client";

import { type DragEvent, type KeyboardEvent, useState } from "react";
import { Icon } from "./icons";

// Reordering lists: drag a row by its handle (or focus it and press the arrow
// keys) on a laptop; up and down buttons where there's no mouse.

/** The list with one entry moved. */
export function moveInList<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export type DragSort = ReturnType<typeof useDragSort>;

export function useDragSort(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<{ from: number; over: number | null } | null>(null);
  return {
    onMove,
    /** For the row (give it the "sort-row" class). */
    row: (index: number) => ({
      "data-sort-row": true,
      "data-dragging": drag?.from === index || undefined,
      "data-drop":
        drag && drag.over === index && drag.from !== index
          ? drag.from < index
            ? "after"
            : "before"
          : undefined,
      onDragOver: (event: DragEvent) => {
        if (!drag) return;
        event.preventDefault();
        event.stopPropagation();
        if (drag.over !== index) setDrag({ ...drag, over: index });
      },
      onDrop: (event: DragEvent) => {
        if (!drag) return;
        event.preventDefault();
        event.stopPropagation();
        if (drag.from !== index) onMove(drag.from, index);
        setDrag(null);
      },
    }),
    /** For the handle inside it. */
    handle: (index: number, count: number) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.stopPropagation();
        setDrag({ from: index, over: null });
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", "");
        const row = event.currentTarget.closest("[data-sort-row]");
        if (row) event.dataTransfer.setDragImage(row, 16, 16);
      },
      onDragEnd: () => setDrag(null),
      onKeyDown: (event: KeyboardEvent) => {
        const to = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : -1;
        if (to < 0 || to >= count) return;
        event.preventDefault();
        onMove(index, to);
      },
    }),
  };
}

/** A row's handle from 1024px up, its up and down buttons below that. */
export function SortControl({
  sort,
  index,
  count,
  label,
}: {
  sort: DragSort;
  index: number;
  count: number;
  label: string;
}) {
  return (
    <>
      {/* Not a <button>: Firefox won't drag those. */}
      <span
        {...sort.handle(index, count)}
        role="button"
        tabIndex={0}
        aria-label={`Move ${label}: drag, or use the arrow keys`}
        className="hidden size-7 flex-none cursor-grab items-center justify-center rounded-[8px] text-muted hover:bg-tint hover:text-ink active:cursor-grabbing wide:flex"
      >
        <Icon name="grip" className="size-4" />
      </span>
      <span className="flex flex-none wide:hidden">
        <button
          type="button"
          aria-label={`Move ${label} up`}
          disabled={index === 0}
          onClick={() => sort.onMove(index, index - 1)}
          className="btn btn-ghost btn-sm px-1.5"
        >
          <Icon name="up" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${label} down`}
          disabled={index === count - 1}
          onClick={() => sort.onMove(index, index + 1)}
          className="btn btn-ghost btn-sm px-1.5"
        >
          <Icon name="down" className="size-4" />
        </button>
      </span>
    </>
  );
}
