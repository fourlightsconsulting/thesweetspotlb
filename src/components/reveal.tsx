"use client";

import { useEffect, useRef, type ComponentProps } from "react";

/**
 * Marks itself `data-inview` the first time it scrolls into view. The CSS in
 * globals.css keys entrance animations (doodles drawing in, cards dropping in)
 * off that attribute, and only hides content where scripts run.
 */
export function Reveal({
  threshold = 0.2,
  ...props
}: ComponentProps<"div"> & { threshold?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-inview", "");
        observer.disconnect();
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return <div ref={ref} data-reveal="" {...props} />;
}
