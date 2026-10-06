import type { Locale } from "./config";

/** Plural forms of a phrase. Arabic uses up to six (zero, one, two, few, many, other). */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Fills `{name}` placeholders in a dictionary string. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

const pluralRules = { en: new Intl.PluralRules("en"), ar: new Intl.PluralRules("ar") };

export const plural = (lang: Locale, forms: PluralForms, count: number) =>
  fill(forms[pluralRules[lang].select(count)] ?? forms.other, { count });

/** "10–15", for minute ranges. */
export const range = ([from, to]: readonly [number, number]) => `${from}–${to}`;
