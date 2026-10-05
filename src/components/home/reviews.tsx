"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { Review } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

const ADVANCE_MS = 6000;

const wrap = (index: number, count: number) => ((index % count) + count) % count;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const subscribeToMotionPref = (onChange: () => void) => {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const prefersReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;

type Props = { reviews: Review[]; t: Dictionary["reviews"]; rtl: boolean };

export function Reviews({ reviews, t, rtl }: Props) {
  const count = reviews.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false); // explicit pause button
  const [holding, setHolding] = useState(false); // hover / focus / touch
  const [inView, setInView] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPref,
    prefersReducedMotion,
    () => false,
  );
  const sectionRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<number | null>(null);

  const playing = !paused && !holding && inView && !reducedMotion;
  const step = (delta: number) => setActive((i) => wrap(i + delta, count));

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.4,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setActive((i) => wrap(i + 1, count)), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [playing, active, count]);

  const onSwipeEnd = (x: number) => {
    if (swipeStart.current === null) return;
    const dx = x - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) < 40) return;
    // Swiping toward the reading direction's start shows the next review.
    step(dx < 0 !== rtl ? 1 : -1);
  };

  return (
    <section
      ref={sectionRef}
      id="reviews"
      aria-roledescription="carousel"
      aria-labelledby="reviews-title"
      className="overflow-x-clip pt-[140px] desk:pt-[clamp(130px,17cqw,260px)]"
    >
      <div className="shell flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2
          id="reviews-title"
          className="font-display text-[clamp(36px,4cqw,60px)] leading-none font-black tracking-[-0.03em]"
        >
          {t.title}
        </h2>
        <p className="font-mono text-[11px] leading-normal text-cacao [direction:ltr]">
          {t.rating}
        </p>
      </div>

      <div
        className="relative mx-auto mt-[clamp(28px,3cqw,48px)] grid max-w-[1440px] touch-pan-y justify-items-center select-none"
        onMouseEnter={() => setHolding(true)}
        onMouseLeave={() => setHolding(false)}
        onFocus={() => setHolding(true)}
        onBlur={() => setHolding(false)}
        onPointerDown={(e) => {
          swipeStart.current = e.clientX;
          if (e.pointerType !== "mouse") setHolding(true);
        }}
        onPointerUp={(e) => {
          onSwipeEnd(e.clientX);
          if (e.pointerType !== "mouse") setHolding(false);
        }}
        onPointerCancel={() => {
          swipeStart.current = null;
          setHolding(false);
        }}
        aria-live={playing ? "off" : "polite"}
      >
        {reviews.map((review, i) => {
          // Shortest signed distance from the active slide, wrapping around.
          let offset = (i - active + count) % count;
          if (offset > count / 2) offset -= count;
          const distance = Math.abs(offset);
          const isActive = offset === 0;

          return (
            <figure
              key={review.author}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={!isActive}
              inert={!isActive}
              style={{ "--offset": offset } as CSSProperties}
              className={`m-0 flex w-[74%] [translate:calc(var(--offset)*var(--dir,1)*(100%-8px))_0] flex-col gap-4 transition-[translate,scale,opacity] duration-700 ease-soft [grid-area:1/1] desk:w-[31%] desk:[translate:calc(var(--offset)*var(--dir,1)*(100%+48px))_0] ${
                isActive
                  ? "scale-100 opacity-100"
                  : distance === 1
                    ? "scale-[.84] opacity-40"
                    : "scale-[.8] opacity-0"
              }`}
            >
              <span
                aria-hidden="true"
                className="h-11 font-display text-8xl leading-[0.55] font-black text-strawberry-cream"
              >
                “
              </span>
              <blockquote className="m-0 font-body text-[clamp(20px,2cqw,28px)] leading-[1.35] font-medium text-pretty">
                {review.quote}
              </blockquote>
              <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-sm">
                <span aria-label={`${review.rating} / 5`} className="text-toffee">
                  {"★".repeat(review.rating)}
                </span>
                <span className="font-semibold">{review.author}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t.previous}
          className="btn btn-secondary btn-sm size-11 p-0"
        >
          <span aria-hidden="true">{rtl ? "→" : "←"}</span>
        </button>

        <div className="flex items-center gap-2 px-2">
          {reviews.map((review, i) => (
            <button
              key={review.author}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${t.goTo} ${i + 1}`}
              aria-current={i === active || undefined}
              className="group flex h-11 items-center"
            >
              <span
                className={`relative block h-2.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ${
                  i === active
                    ? "w-9 bg-blueberry/25"
                    : "w-2.5 bg-chocolate/20 group-hover:bg-chocolate/40"
                }`}
              >
                {i === active && (
                  <span
                    key={active}
                    className="absolute inset-y-0 start-0 block w-full origin-left rounded-full bg-blueberry rtl:origin-right"
                    style={{
                      animation: reducedMotion
                        ? "none"
                        : `tss-progress ${ADVANCE_MS}ms linear both`,
                      animationPlayState: playing ? "running" : "paused",
                    }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label={t.next}
          className="btn btn-secondary btn-sm size-11 p-0"
        >
          <span aria-hidden="true">{rtl ? "←" : "→"}</span>
        </button>

        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t.play : t.pause}
            className="ms-2 inline-flex size-11 items-center justify-center rounded-full text-cacao transition-colors hover:text-chocolate"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
              {paused ? (
                <path d="M8 5.5v13l10.5-6.5z" />
              ) : (
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              )}
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
