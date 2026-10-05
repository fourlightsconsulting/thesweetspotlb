// Hand-drawn accent layer (3a). Decorative only: aria-hidden, round caps,
// slightly wobbly cubic paths. Every path has pathLength="1" so the
// `.doodle` styles can draw it in when its <Reveal> scrolls into view.
import type { CSSProperties } from "react";

type DoodleProps = { className?: string; style?: CSSProperties };

const base = "doodle overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]";

/** Caramel marker underline, stretched under 1–3 words. */
export function Underline({ className = "", style }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 26"
      preserveAspectRatio="none"
      className={`${base} stroke-caramel ${className}`}
      style={style}
    >
      <path pathLength={1} d="M4 15 C 70 5, 170 3, 296 10" strokeWidth={9} />
      <path pathLength={1} d="M46 22 C 116 16, 196 15, 258 18" strokeWidth={4} opacity={0.75} />
    </svg>
  );
}

/** Curved arrow from the right, pointing down-left (hero note → button). */
export function ArrowToButton({ className = "", style }: DoodleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 72 44" className={`${base} ${className}`} style={style}>
      <path pathLength={1} d="M68 8 C 48 -2, 20 4, 9 30" strokeWidth={3} />
      <path pathLength={1} d="M3 20 L8 32 L20 27" strokeWidth={3} />
    </svg>
  );
}

/** Three short rays pointing at a product. */
export function Rays({ className = "", style }: DoodleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" className={`${base} ${className}`} style={style}>
      <path pathLength={1} d="M10 30 L22 36" strokeWidth={4} />
      <path pathLength={1} d="M24 8 L30 24" strokeWidth={4} />
      <path pathLength={1} d="M50 4 L42 22" strokeWidth={4} />
    </svg>
  );
}

/** Arrow curving up-left (weekly special note → cup). */
export function ArrowUpLeft({ className = "", style }: DoodleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 56 50" className={`${base} ${className}`} style={style}>
      <path pathLength={1} d="M50 44 C 26 44, 10 32, 12 6" strokeWidth={2.6} />
      <path pathLength={1} d="M4 14 L12 4 L21 13" strokeWidth={2.6} />
    </svg>
  );
}

/** Arrow curving up-right (dessert note → round photo). */
export function ArrowUpRight({ className = "", style }: DoodleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 44" className={`${base} ${className}`} style={style}>
      <path pathLength={1} d="M2 36 C 22 40, 44 30, 50 6" strokeWidth={2.6} />
      <path pathLength={1} d="M41 13 L50 4 L57 15" strokeWidth={2.6} />
    </svg>
  );
}

/** Arrow sweeping down then right (story "Tripoli" note → shop photo). */
export function ArrowSweepRight({ className = "", style }: DoodleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 50" className={`${base} ${className}`} style={style}>
      <path pathLength={1} d="M4 6 C 10 34, 40 44, 72 34" strokeWidth={2.8} />
      <path pathLength={1} d="M60 26 L73 34 L61 44" strokeWidth={2.8} />
    </svg>
  );
}

/** Cherry heart at the end of a line. */
export function Heart({ className = "", style }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 34 32"
      className={`${base} stroke-cherry ${className}`}
      style={style}
    >
      <path
        pathLength={1}
        d="M17 29 C 7 22, 2 14, 5 8 C 8 2, 15 4, 17 10 C 18 4, 26 1, 29 7 C 32 14, 25 22, 16 30 C 15 31, 14 30, 13 28"
        strokeWidth={3}
      />
    </svg>
  );
}

/** Caramel loop drawn around a short label. Stretches to its box. */
export function Circle({ className = "", style }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 50"
      preserveAspectRatio="none"
      className={`${base} stroke-caramel ${className}`}
      style={style}
    >
      <path
        pathLength={1}
        d="M70 4 C 104 3, 118 14, 116 26 C 113 42, 78 48, 46 46 C 14 44, 2 34, 5 22 C 8 10, 34 3, 62 4 C 76 4, 88 7, 92 10"
        strokeWidth={2.4}
      />
    </svg>
  );
}
