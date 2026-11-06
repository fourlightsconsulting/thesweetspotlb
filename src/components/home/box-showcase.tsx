"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Slide = { id: string; image: StaticImageData; name: string };
type Props = { slides: Slide[]; t: Dictionary["boxes"] };

const ROTATION_MS = 5500;
const SWIPE_DISTANCE = 36;

export function BoxShowcase({ slides, t }: Props) {
  const showcaseRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const current = active % slides.length;

  useEffect(() => {
    const showcase = showcaseRef.current;
    if (!showcase || hovered || focused || dragging || slides.length < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let timer: number | undefined;
    const syncRotation = () => {
      window.clearInterval(timer);
      if (inView && !document.hidden && !reducedMotion.matches) {
        timer = window.setInterval(
          () => setActive((index) => (index + 1) % slides.length),
          ROTATION_MS,
        );
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= 0.25;
        syncRotation();
      },
      { threshold: 0.25 },
    );

    observer.observe(showcase);
    document.addEventListener("visibilitychange", syncRotation);
    reducedMotion.addEventListener("change", syncRotation);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncRotation);
      reducedMotion.removeEventListener("change", syncRotation);
    };
  }, [hovered, focused, dragging, slides.length]);

  const finishSwipe = (pointerId: number) => {
    const start = swipeStart.current;
    if (!start || start.pointerId !== pointerId) return null;
    swipeStart.current = null;
    setDragging(false);
    return start;
  };

  return (
    <div
      ref={showcaseRef}
      role="group"
      aria-label={t.tag}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      className="mx-auto w-[calc(100%_-_2.5rem)] max-w-[440px] min-w-0 desk:w-full desk:max-w-[580px]"
    >
      <div
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || slides.length < 2) return;
          swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerUp={(event) => {
          const start = finishSwipe(event.pointerId);
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.25) return;

          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          const step = (rtl ? dx > 0 : dx < 0) ? 1 : -1;
          setActive((index) => (index + step + slides.length) % slides.length);
        }}
        onLostPointerCapture={(event) => finishSwipe(event.pointerId)}
        className="relative aspect-[5/4] [touch-action:pan-y_pinch-zoom] select-none"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            aria-hidden={index !== current}
            className={`absolute inset-[8%] motion-safe:transition-opacity motion-safe:duration-500 ${index === current ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={slide.image}
              alt={slide.name}
              fill
              draggable={false}
              sizes="(min-width: 1200px) 480px, (min-width: 820px) 40vw, (min-width: 520px) 365px, 75vw"
              className="object-contain drop-shadow-[0_16px_14px_rgba(26,86,167,.25)]"
            />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center text-blueberry">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={slide.name}
              aria-pressed={index === current}
              onClick={() => setActive(index)}
              className="group grid size-9 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-raspberry"
            >
              <span className="size-2.5 rounded-full border border-blueberry/70 group-aria-pressed:bg-blueberry" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
