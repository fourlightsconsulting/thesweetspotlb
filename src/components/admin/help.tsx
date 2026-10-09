"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type Place = { top: number; left: number; width: number };

/**
 * A "?" beside a title that shows its explanation on tap or click; Escape, a
 * tap elsewhere or scrolling closes it. Explanations live here rather than on
 * the page, and only where one is really needed.
 */
export function Help({
  children,
  label = "What’s this?",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [place, setPlace] = useState<Place | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    const outside = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [place]);

  // Under the "?", lined up with it, but always inside the screen.
  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (place) return setPlace(null);
    const box = event.currentTarget.getBoundingClientRect();
    const margin = 16;
    const width = Math.min(280, window.innerWidth - margin * 2);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const preferred = rtl ? box.right - width : box.left;
    const left = Math.min(Math.max(preferred, margin), window.innerWidth - width - margin);
    setPlace({ top: box.bottom + 8, left, width });
  };

  return (
    <span ref={wrapRef} className="ms-1.5 inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={place !== null}
        onClick={toggle}
        className="inline-flex size-5 items-center justify-center rounded-full border border-line-strong font-ui text-[11px] leading-none font-bold text-muted transition-colors hover:border-accent hover:text-accent aria-expanded:border-accent aria-expanded:bg-accent aria-expanded:text-surface"
      >
        ?
      </button>
      {place && (
        <span
          role="note"
          style={place}
          className="fixed z-50 rounded-[12px] border border-line bg-surface p-3 text-start text-[13px] leading-5 font-normal tracking-normal text-ink normal-case shadow-[0_8px_24px_rgba(53,37,34,0.14)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
