"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { Icon } from "./icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Shown under the title. */
  subtitle?: ReactNode;
  /** Stays at the bottom while the body scrolls (actions). */
  footer?: ReactNode;
  children: ReactNode;
};

/** A panel from the side (full screen on phones), on a native modal dialog. */
export function Drawer({ open, onClose, title, subtitle, footer, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="ms-auto me-0 h-svh max-h-none w-full max-w-[520px] bg-surface p-0 text-ink backdrop:bg-chocolate/30"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-lg leading-7 font-bold">{title}</h2>
              {subtitle && <div className="text-[13px] text-muted">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn btn-ghost -me-2 size-9 p-0"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
