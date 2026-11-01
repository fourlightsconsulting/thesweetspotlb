"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormState } from "./form";

// How every edit page saves: changes stay on the page until the bar's Save,
// with a way to discard them and a warning before leaving without saving.

/** Warns before closing the tab or following a link while there are unsaved changes. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const leaving = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.download) return;
      if (link.pathname === location.pathname && link.search === location.search) return;
      if (!confirm("Leave without saving your changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leaving, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leaving, true);
    };
  }, [dirty]);
}

/**
 * Whether a form differs from how it was last saved, for forms whose fields
 * live in the DOM. Until someone touches the form, whatever renders counts as
 * saved, so fields that settle after a save or a discard don't count as edits.
 * `savedAt` is the time of the last successful save.
 */
export function useDirtyForm(savedAt: number) {
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef("");
  const settling = useRef(true);
  const [dirty, setDirty] = useState(false);

  const read = useCallback(
    () => JSON.stringify([...new FormData(formRef.current!)].map(([k, v]) => [k, String(v)])),
    [],
  );
  /** The form as it is now is the saved state. */
  const settle = useCallback(() => {
    settling.current = true;
    baseline.current = read();
    setDirty(false);
  }, [read]);

  useEffect(() => {
    const form = formRef.current!;
    baseline.current = read();
    const check = () => {
      if (settling.current) baseline.current = read();
      else setDirty(read() !== baseline.current);
    };
    const touched = () => {
      settling.current = false;
    };
    const observer = new MutationObserver(check);
    observer.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["value"],
    });
    form.addEventListener("pointerdown", touched, true);
    form.addEventListener("keydown", touched, true);
    form.addEventListener("input", check);
    form.addEventListener("change", check);
    return () => {
      observer.disconnect();
      form.removeEventListener("pointerdown", touched, true);
      form.removeEventListener("keydown", touched, true);
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
    };
  }, [read]);

  const [lastSaved, setLastSaved] = useState(savedAt);
  if (savedAt !== lastSaved) {
    setLastSaved(savedAt);
    setDirty(false);
  }
  useEffect(() => {
    if (!savedAt) return;
    settling.current = true;
    baseline.current = read();
  }, [savedAt, read]);

  return { formRef, dirty, settle };
}

/**
 * The bar along the bottom of an edit page: it appears with the first change.
 * `isNew` keeps it up on a form for something not created yet.
 */
export function SaveBar({
  dirty,
  pending,
  state,
  onDiscard,
  saveLabel = "Save",
  dirtyText = "Unsaved changes",
  isNew = false,
}: {
  dirty: boolean;
  pending: boolean;
  state: FormState;
  onDiscard?: () => void;
  saveLabel?: string;
  dirtyText?: string;
  isNew?: boolean;
}) {
  const savedAt = state.status === "saved" ? state.at : 0;
  const [fadedAt, setFadedAt] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setFadedAt(savedAt), 2500);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const failed = state.status === "error";
  const justSaved = savedAt !== 0 && fadedAt !== savedAt && !dirty;
  if (!dirty && !pending && !failed && !justSaved && !isNew) return null;

  return (
    <div className="slide-up fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur wide:start-[240px]">
      <div className="mx-auto flex max-w-[1264px] flex-wrap items-center justify-end gap-3 px-4 py-3 wide:px-8">
        <p
          role={failed ? "alert" : "status"}
          className={`me-auto min-w-0 text-[13px] font-semibold ${failed ? "text-bad" : justSaved ? "text-good" : "text-muted"}`}
        >
          {state.status === "error"
            ? state.message
            : justSaved
              ? "Saved"
              : dirty
                ? dirtyText
                : null}
        </p>
        {dirty && onDiscard && (
          <button type="button" onClick={onDiscard} disabled={pending} className="btn btn-ghost">
            Discard
          </button>
        )}
        <button className="btn btn-primary" disabled={pending || (!dirty && !isNew)}>
          {pending ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
