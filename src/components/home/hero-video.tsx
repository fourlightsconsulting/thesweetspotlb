"use client";

import { useEffect, useState } from "react";
import type { HeroVideo as HeroVideoConfig } from "@/data/site";

const desktopQuery = "(width >= 51.25rem)";

/**
 * Mounts the hero video only after the page has finished loading, so it never
 * competes with the first paint. The poster underneath stays visible until the
 * first frame plays. Skipped for reduced-motion and data-saver visitors, and on
 * screen sizes without a clip (the stills stay).
 */
export function HeroVideo({ mobile, desktop, startAt = 0 }: HeroVideoConfig) {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || connection?.saveData) return;
    const clip = matchMedia(desktopQuery).matches ? desktop : mobile;
    if (!clip) return;

    let timer = 0;
    const start = () => {
      // Start where the poster frame was taken, so the swap is seamless.
      timer = window.setTimeout(() => setSrc(startAt ? `${clip}#t=${startAt}` : clip), 0);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
    };
  }, [mobile, desktop, startAt]);

  if (!src) return null;

  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
    />
  );
}
