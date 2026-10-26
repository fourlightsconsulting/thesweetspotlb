"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { HomeSticker } from "@/components/home/sticker";
import { site } from "@/data/site";
import type { Review } from "@/data/social";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fill, plural } from "@/i18n/format";

type Props = {
  lang: Locale;
  reviews: Review[];
  /** The shop's Google rating, once connected. */
  rating: { rating: number; count: number } | null;
  t: Dictionary["reviews"];
};

const DAY = 86_400_000;

// Today, read in the browser: the page is prerendered, so a "2 weeks ago"
// worked out at build time would go stale. The server renders the month.
const noSubscribe = () => () => {};
const today = () => Math.floor(Date.now() / DAY);
const onServer = () => null;

/** "2 weeks ago" from today, or "Oct 2026" when today isn't known yet. */
function postedOn(date: string, day: number | null, lang: Locale) {
  const posted = Date.parse(date);
  if (day === null) {
    return new Intl.DateTimeFormat(lang, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(posted);
  }
  const days = Math.max(0, day - Math.floor(posted / DAY));
  const ago = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (days < 7) return ago.format(-days, "day");
  if (days < 30) return ago.format(-Math.floor(days / 7), "week");
  if (days < 365) return ago.format(-Math.floor(days / 30), "month");
  return ago.format(-Math.floor(days / 365), "year");
}

// Google's avatars come in colours; these are the brand's.
const avatars = [
  "bg-blueberry text-paper",
  "bg-raspberry text-ink",
  "bg-cotton-candy text-ink",
  "bg-strawberry-cream text-blueberry",
];

/** Long reviews fold to four lines behind "Read more". */
const LONG = 150;

/**
 * Reviews as Google shows them: a summary (score once connected) and a looping
 * row of cards, centred on phones and navigable with arrows on desktop.
 */
export function Reviews({ lang, reviews, rating, t }: Props) {
  const day = useSyncExternalStore(noSubscribe, today, onServer);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const listRef = useRef<HTMLUListElement>(null);
  const currentRef = useRef(0);

  // The outer copies provide neighbours across the seam. Once scrolling stops,
  // move to the identical card in the middle copy without a visible transition.
  useLayoutEffect(() => {
    const list = listRef.current;
    const count = reviews.length;
    if (!list || count === 0) return;
    const cards = Array.from(list.children) as HTMLElement[];
    let idle: ReturnType<typeof setTimeout>;
    let width = list.clientWidth;

    const centre = (index: number) => {
      const card = cards[index].getBoundingClientRect();
      const rail = list.getBoundingClientRect();
      const offset = card.left + card.width / 2 - (rail.left + rail.width / 2);
      // Fractional-pixel corrections with scrollBy can snap to the next card.
      if (Math.abs(offset) < 1) return;
      list.scrollTo({
        left: list.scrollLeft + offset,
        behavior: "instant",
      });
    };

    const settle = () => {
      clearTimeout(idle);
      const rail = list.getBoundingClientRect();
      const middle = rail.left + rail.width / 2;
      let nearest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const away = Math.abs(rect.left + rect.width / 2 - middle);
        if (away < distance) {
          nearest = index;
          distance = away;
        }
      });
      currentRef.current = nearest % count;
      if (nearest < count || nearest >= count * 2) {
        centre(count + currentRef.current);
      }
    };

    // scrollend keeps the reset out of a swipe's momentum. The idle timer also
    // supports browsers that do not yet dispatch scrollend.
    const onScroll = () => {
      clearTimeout(idle);
      idle = setTimeout(settle, 180);
    };
    currentRef.current = 0;
    centre(count);
    if (!Reflect.has(list, "onscrollend")) {
      list.addEventListener("scroll", onScroll, { passive: true });
    }
    list.addEventListener("scrollend", settle);
    const observer = new ResizeObserver(() => {
      if (list.clientWidth === width) return;
      width = list.clientWidth;
      centre(count + currentRef.current);
    });
    observer.observe(list);

    return () => {
      clearTimeout(idle);
      observer.disconnect();
      list.removeEventListener("scroll", onScroll);
      list.removeEventListener("scrollend", settle);
    };
  }, [reviews.length, lang]);

  // One card's width (plus the gap) at a time, in the reading direction.
  const step = (delta: number) => {
    const list = listRef.current;
    const card = list?.firstElementChild;
    if (!list || !card) return;
    const dir = getComputedStyle(list).direction === "rtl" ? -1 : 1;
    const by = card.getBoundingClientRect().width + parseFloat(getComputedStyle(list).columnGap);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth";
    list.scrollBy({ left: delta * dir * by, behavior });
  };

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="wave-top bg-paper py-section [--wave:var(--color-paper)]"
    >
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h2 id="reviews-title" className="relative title-section max-sm:w-full">
            <span className="block max-w-[calc(100%-96px)] sm:max-w-none">{t.title}</span>
            <HomeSticker
              name="smiley"
              className="absolute end-0 top-0 w-[80px] rotate-10 sm:-end-28 sm:-top-12 sm:w-[96px] desk:-end-36 desk:-top-16 desk:w-[120px] lg:-top-14 xl:-top-8"
            />
          </h2>

          {rating && (
            <div
              aria-label={t.google}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-sm leading-5"
            >
              <GoogleG className="size-5 flex-none" />
              <b className="text-base">{rating.rating.toFixed(1)}</b>
              <Stars
                value={rating.rating}
                label={fill(t.ratingOf, { rating: rating.rating.toFixed(1) })}
              />
              <span className="text-ink-soft">{plural(lang, t.count, rating.count)}</span>
            </div>
          )}
        </div>

        <ul
          ref={listRef}
          className="-mx-[clamp(20px,5cqw,72px)] mt-[clamp(28px,3cqw,44px)] grid snap-x snap-mandatory [scrollbar-width:none] auto-cols-[min(80%,340px)] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain px-[clamp(20px,5cqw,72px)] py-2 desk:-mx-2 desk:auto-cols-[calc((100%-2*20px)/3)] desk:gap-5 desk:px-2"
        >
          {[...reviews, ...reviews, ...reviews].map((review, index) => {
            const i = index % reviews.length;
            const copy = index < reviews.length || index >= reviews.length * 2;
            const long = review.quote.length > LONG;
            const expanded = open[i] ?? false;
            return (
              <li
                key={`${index}-${review.author}`}
                aria-hidden={copy || undefined}
                className="min-w-0 snap-center"
              >
                <article className="flex h-full flex-col gap-2.5 rounded-xl bg-whipped p-[18px] shadow-[0_1px_2px_rgba(29,29,34,.16),0_2px_10px_rgba(29,29,34,.08)]">
                  <header className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex size-10 flex-none items-center justify-center rounded-full font-ui text-lg font-medium ${avatars[i % avatars.length]}`}
                    >
                      {review.author.charAt(0)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col font-ui">
                      <span className="truncate text-[15px] leading-5 font-semibold">
                        {review.author}
                      </span>
                      <span className="text-[13px] leading-[18px] text-ink-soft">
                        {postedOn(review.date, day, lang)}
                      </span>
                    </span>
                    <GoogleG className="size-5 flex-none" />
                  </header>
                  <Stars
                    value={review.rating}
                    label={fill(t.ratingOf, { rating: review.rating })}
                  />
                  {/* Reviews come in either language: each sets its own direction. */}
                  <blockquote
                    dir="auto"
                    className={`m-0 font-ui text-[15px] leading-[1.55] text-pretty ${long && !expanded ? "line-clamp-4" : ""}`}
                  >
                    {review.quote}
                  </blockquote>
                  {long && (
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [i]: !expanded }))}
                      aria-expanded={expanded}
                      tabIndex={copy ? -1 : undefined}
                      onPointerDown={(event) => {
                        if (copy) event.preventDefault();
                      }}
                      className="self-start font-ui text-sm font-semibold text-blueberry"
                    >
                      {expanded ? t.readLess : t.readMore}
                    </button>
                  )}
                </article>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t.previous}
            className="btn btn-secondary btn-sm hidden size-11 p-0 desk:inline-flex"
          >
            <span aria-hidden="true">{lang === "ar" ? "→" : "←"}</span>
          </button>
          <a
            href={site.tripoliDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${t.leaveReview} · ${t.google}`}
            className="btn btn-secondary gap-2.5 px-4 text-sm"
          >
            <GoogleG className="size-5 flex-none" />
            {t.leaveReview}
          </a>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t.next}
            className="btn btn-secondary btn-sm hidden size-11 p-0 desk:inline-flex"
          >
            <span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/** Five stars, filled to the rating, in Google's own yellow. */
function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-[17px] ${n <= Math.round(value) ? "fill-[#fbbc04]" : "fill-ink/15"}`}
        >
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

/** Google's "G", as on its review cards. */
function GoogleG({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={className}>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}
