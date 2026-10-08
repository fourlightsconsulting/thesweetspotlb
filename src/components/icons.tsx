// Menu icons: one line drawing per category, in the same hand-drawn style as
// the doodles. Decorative only (aria-hidden). Strokes keep the same width at
// any size; set it with [--icon-stroke:…] (default 2px) and the colour with a
// stroke-* utility.
const drawings = {
  // Folded in quarters with a chocolate drizzle, on a plate
  crepes: [
    "M6 24 L6.8 5.6 C 16.4 5.6, 25.6 13.6, 26.4 23.6 C 19.6 24.4, 12.6 24.4, 6 24 Z",
    "M6.4 14.6 C 12 14.4, 16.4 18.6, 16.6 24.2",
    "M10 10.6 C 11.6 12.6, 13 9.8, 14.8 12 C 16.6 14.2, 17.8 11.8, 19.8 14.2",
    "M3.6 27.4 C 11 28.4, 21 28.4, 28.4 27.4",
  ],
  waffles: [
    "M8.5 6 C 14 5.2, 19.5 5.3, 25.5 6.5 C 26.6 12.5, 26.7 19, 25.8 25.4 C 19.8 26.6, 13 26.6, 6.6 25.6 C 5.6 19, 5.5 12.6, 6.5 7.6 C 6.7 6.6, 7.4 6.2, 8.5 6 Z",
    "M12.6 6 L12.2 26.2",
    "M19.5 5.7 L19.8 26.2",
    "M6 12.6 L26.4 12.9",
    "M5.8 19.4 L26.5 19.6",
  ],
  // A stack of three with butter and a syrup drip, on a plate
  pancakes: [
    "M5.5 11.5 C 5.5 8.6, 26.5 8.6, 26.5 11.5 C 26.5 14.4, 5.5 14.4, 5.5 11.5 Z",
    "M5.5 11.5 L5.5 15.5 C 5.5 18.4, 26.5 18.4, 26.5 15.5 L26.5 11.5",
    "M5.5 15.5 L5.5 19.5 C 5.5 22.4, 26.5 22.4, 26.5 19.5 L26.5 15.5",
    "M13.8 10.6 L17.4 9.8 L18.6 11.4 L15 12.2 Z",
    "M9.4 13.4 C 9.4 16.6, 12.4 16.8, 12.8 14",
    "M3.8 25.8 C 11 26.8, 21 26.8, 28.2 25.8",
  ],
  // Three profiteroles, chocolate on top, on a plate
  profiteroles: [
    "M11 10.8 C 11 4.2, 21 4.2, 21 10.8 C 21 17.4, 11 17.4, 11 10.8 Z",
    "M5.8 20.2 C 5.8 13.6, 15.8 13.6, 15.8 20.2 C 15.8 26.8, 5.8 26.8, 5.8 20.2 Z",
    "M16.2 20.2 C 16.2 13.6, 26.2 13.6, 26.2 20.2 C 26.2 26.8, 16.2 26.8, 16.2 20.2 Z",
    "M11.4 9.4 C 12.8 11.2, 13.8 8.6, 15.4 10.4 C 17 12.2, 18 9, 20.6 9.8",
    "M3.6 28 C 11 29, 21 29, 28.4 28",
  ],
  // A scoop on a cone
  rolls: [
    "M8.6 14.5 C 7.6 9, 11.2 5, 16 5 C 20.8 5, 24.4 9, 23.4 14.5",
    "M8.6 14.5 C 10 16.3, 11.8 13.6, 13.6 15.4 C 15.4 17.2, 17 13.8, 18.8 15.4 C 20.4 16.8, 22 14.2, 23.4 14.5",
    "M9.8 15.8 L15.6 28.2 C 15.8 28.6, 16.2 28.6, 16.4 28.2 L22.2 15.8",
    "M13.3 17.6 L18.9 21.2",
    "M18.7 17.6 L13.1 21.2",
  ],
  // A bowl piled high, on a little foot
  bowls: [
    "M4.5 15 C 4.8 22.5, 10 27, 16 27 C 22 27, 27.2 22.5, 27.5 15 Z",
    "M12 27.2 L11.2 29.2 L20.8 29.2 L20 27.2",
    "M7.5 15 C 7.6 11, 11 9.5, 13 11 C 13.8 8, 18.4 7.6, 19.4 10.6 C 21.6 9.4, 24.8 11.4, 24.5 15",
    "M16.2 8.6 C 16.2 7, 17.2 6, 18.8 5.8",
  ],
  // A gift box with a bow
  boxes: [
    "M7.2 14 L8 26.6 C 8 27.2, 8.4 27.5, 9 27.5 L23 27.5 C 23.6 27.5, 24 27.2, 24 26.6 L24.8 14",
    "M5.6 10.2 C 12 9.8, 20 9.8, 26.4 10.2 L26.2 14 C 19.6 14.3, 12.4 14.3, 5.8 14 Z",
    "M16 10.2 L16 27.4",
    "M16 10 C 13.6 6.8, 9.6 5.2, 9.8 7.8 C 10 9.6, 13.4 10, 16 10 C 18.6 10, 22 9.6, 22.2 7.8 C 22.4 5.2, 18.4 6.8, 16 10 Z",
  ],
  // An iced cup with a dome lid and straw
  drinks: [
    "M9 12.6 C 9.2 8.4, 22.8 8.4, 23 12.6",
    "M7.6 12.8 C 13 12.4, 19 12.4, 24.4 12.8",
    "M9 13 L10.8 27 C 10.9 27.7, 11.4 28, 12 28 L20 28 C 20.6 28, 21.1 27.7, 21.2 27 L23 13",
    "M17.6 9.4 L20.2 3.6 L23.6 4.4",
    "M9.9 18.8 C 14 19.1, 18 19.1, 22.1 18.8",
    "M10.5 23.4 C 14.2 23.7, 17.8 23.7, 21.5 23.4",
  ],
};

export type MenuIconName = keyof typeof drawings;

/** All icons in menu order, for decorative rows (ticker, footer). */
export const menuIconNames = Object.keys(drawings) as MenuIconName[];

const isMenuIconName = (name: string): name is MenuIconName => name in drawings;

/** A category slug without its own drawing (added in the admin) gets the crêpe. */
type Props = { name: string; className?: string };

export function MenuIcon({ name, className = "" }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={`flex-none overflow-visible fill-none [stroke-width:var(--icon-stroke,2px)] [stroke-linecap:round] [stroke-linejoin:round] ${className}`}
    >
      {drawings[isMenuIconName(name) ? name : "crepes"].map((d) => (
        <path key={d} d={d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
