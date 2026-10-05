"use client";

import { useEffect, useState } from "react";

type Props = { desktop: string; mobile: string };

/**
 * Mounts the hero video only after the page has finished loading, so it never
 * competes with the first paint. The still underneath stays visible until the
 * first frame plays. Skipped for reduced-motion and data-saver visitors.
 */
export function HeroVideo({ desktop, mobile }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || connection?.saveData) return;

    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => setEnabled(true), 0);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
    };
  }, []);

  if (!enabled) return null;

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`}
    >
      <source src={mobile} media="(max-width: 819px)" type="video/mp4" />
      <source src={desktop} type="video/mp4" />
    </video>
  );
}
