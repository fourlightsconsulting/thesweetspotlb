"use client";

import { useRef, useState } from "react";

/** Pointer (mouse/touch) and keyboard reordering from an explicit drag handle. */
export function useDragOrder(
  group: string,
  ids: string[],
  onMove: (from: string, to: string) => void,
) {
  const [dragging, setDragging] = useState<string | null>(null);
  const active = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const move = (from: string, to: string) => {
    if (from === to) return;
    onMove(from, to);
    setAnnouncement(`Moved to position ${ids.indexOf(to) + 1} of ${ids.length}.`);
  };
  const finish = () => {
    active.current = null;
    setDragging(null);
  };
  return {
    dragging,
    announcement,
    handle: (id: string, label: string) => ({
      type: "button" as const,
      "aria-label": `Reorder ${label}`,
      "aria-describedby": "drag-order-help",
      className: "btn btn-ghost btn-sm touch-none cursor-grab px-1.5 active:cursor-grabbing",
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || active.current) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        active.current = id;
        setDragging(id);
      },
      onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (active.current !== id) return;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>(`[data-sort-group="${CSS.escape(group)}"]`);
        const targetId = target?.dataset.sortId;
        if (target && targetId && targetId !== id) {
          const rect = target.getBoundingClientRect();
          const movingDown = ids.indexOf(id) < ids.indexOf(targetId);
          if (
            movingDown
              ? event.clientY > rect.top + rect.height / 2
              : event.clientY < rect.top + rect.height / 2
          )
            move(id, targetId);
        }
        if (event.clientY < 80) window.scrollBy(0, -16);
        else if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 16);
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const target = ids[ids.indexOf(id) + (event.key === "ArrowUp" ? -1 : 1)];
        if (target) move(id, target);
      },
    }),
  };
}

export function DragGrip() {
  return (
    <svg viewBox="0 0 16 20" className="size-5 fill-current text-muted" aria-hidden="true">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="11" cy="10" r="1.5" />
      <circle cx="5" cy="16" r="1.5" />
      <circle cx="11" cy="16" r="1.5" />
    </svg>
  );
}
