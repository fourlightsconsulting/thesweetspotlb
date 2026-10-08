"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MenuIcon } from "@/components/icons";
import type { Category } from "@/data/menu";
import type { Locale } from "@/i18n/config";

type Props = { categories: Category[]; lang: Locale; label: string };

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Sticky category pills under the header. The pill of the section in view stays highlighted. */
export function CategoryTabs({ categories, lang, label }: Props) {
  const barRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | undefined>(categories[0]?.id);

  // Anchor jumps (#crepes from the home page) clear the header and this bar.
  useEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(([entry]) =>
      root.style.setProperty("--sticky-extra", `${entry.borderBoxSize[0].blockSize}px`),
    );
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--sticky-extra");
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 32;
      let current = categories[0]?.id;
      for (const category of categories) {
        const section = document.getElementById(category.id);
        if (section && section.getBoundingClientRect().top <= line) current = category.id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atBottom ? categories.at(-1)?.id : current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [categories]);

  // Keep the active pill in view inside the scrolling bar.
  useEffect(() => {
    const tab = barRef.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    tab?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <nav
      ref={barRef}
      aria-label={label}
      className="sticky top-[var(--header-h,74px)] z-30 border-b border-chocolate/8 bg-vanilla/94 backdrop-blur-md"
    >
      <ul className="shell flex [scrollbar-width:none] gap-2 overflow-x-auto py-2.5">
        {categories.map((category) => (
          <li key={category.id} className="flex-none">
            <a
              href={`#${category.id}`}
              data-tab={category.id}
              aria-current={active === category.id ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setActive(category.id);
                document.getElementById(category.id)?.scrollIntoView({
                  block: "start",
                  behavior: reducedMotion() ? "auto" : "smooth",
                });
                history.replaceState(history.state, "", `#${category.id}`);
              }}
              className="flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-chocolate/15 bg-whipped ps-1.5 pe-4 font-ui text-[15px] font-semibold whitespace-nowrap transition-colors duration-200 hover:border-chocolate/40 aria-[current=true]:border-blueberry aria-[current=true]:bg-blueberry aria-[current=true]:text-vanilla"
            >
              {category.image ? (
                <Image
                  src={category.image}
                  alt=""
                  sizes="32px"
                  className="size-8 rounded-full bg-cotton-candy object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full bg-cotton-candy"
                >
                  <MenuIcon name={category.id} className="size-5 stroke-blueberry" />
                </span>
              )}
              {category.name[lang]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
