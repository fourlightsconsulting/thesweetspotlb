import type { Locale } from "@/i18n/config";

/** Sort a copy by the displayed name, using the language's alphabet. */
export function alphabetical<T>(
  rows: readonly T[],
  name: (row: T) => string,
  lang: Locale = "en",
): T[] {
  const collator = new Intl.Collator(lang, { sensitivity: "base", numeric: true });
  return [...rows].sort((a, b) => collator.compare(name(a), name(b)));
}
