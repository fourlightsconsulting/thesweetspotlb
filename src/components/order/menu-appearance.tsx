import type { Dictionary } from "@/i18n/dictionaries/en";

export const menuAppearances = {
  pink: { background: "var(--color-strawberry-cream)", card: "var(--color-pink-tint)" },
  white: { background: "var(--color-paper)", card: "var(--color-whipped)" },
  blue: {
    background: "var(--color-cotton-candy)",
    card: "color-mix(in srgb, var(--color-cotton-candy) 22%, var(--color-whipped))",
  },
  whitePink: { background: "var(--color-paper)", card: "var(--color-strawberry-cream)" },
  whiteBlue: { background: "var(--color-paper)", card: "var(--color-cotton-candy)" },
} as const;

export type MenuAppearance = keyof typeof menuAppearances;

/** Temporary client review control; only the menu's background and cards change. */
export function MenuAppearancePicker({
  value,
  onChange,
  t,
}: {
  value: MenuAppearance;
  onChange: (value: MenuAppearance) => void;
  t: Dictionary["order"]["appearance"];
}) {
  const colours = menuAppearances[value];
  return (
    <label className="flex max-w-md flex-col gap-1.5 font-ui text-[13px] font-semibold">
      {t.label}
      <span className="flex items-center gap-2 rounded-[16px] border border-blueberry/15 bg-whipped/85 px-3">
        <span aria-hidden="true" className="flex flex-none -space-x-1 rtl:space-x-reverse">
          <span
            className="size-5 rounded-full border border-ink/15"
            style={{ background: colours.background }}
          />
          <span
            className="size-5 rounded-full border border-ink/15"
            style={{ background: colours.card }}
          />
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as MenuAppearance)}
          className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent py-2 pe-1 font-ui text-[15px] font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-raspberry"
        >
          {(Object.keys(menuAppearances) as MenuAppearance[]).map((option) => (
            <option key={option} value={option}>
              {t.options[option]}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
