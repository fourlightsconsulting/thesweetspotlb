// Admin interface icons: 24px line drawings, stroke in currentColor.

const paths = {
  home: ["M4 11.5 12 5l8 6.5", "M6 10v9h12v-9", "M10 19v-5h4v5"],
  team: [
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5",
    "M16 4.3a3.5 3.5 0 0 1 0 6.4",
    "M18 14.8c1.9.8 3.1 2.6 3.5 5.2",
  ],
  account: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 20.5c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  signOut: ["M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4", "M15 8l4 4-4 4", "M19 12H9"],
  external: [
    "M14 5h5v5",
    "M19 5l-8 8",
    "M17 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5",
  ],
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`flex-none fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round] ${className}`}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
