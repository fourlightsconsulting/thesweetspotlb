import type { Locale } from "./config";

/** Every internal link goes through here so locale prefixes stay consistent. */
export const routes = (lang: Locale) => ({
  home: `/${lang}`,
  order: `/${lang}/order`,
  category: (id: string) => `/${lang}/order#${id}`,
  item: (id: string, options?: Record<string, string>) =>
    `/${lang}/order?${new URLSearchParams({ item: id, ...options })}`,
  about: `/${lang}/about`,
  contact: `/${lang}/contact`,
  privacy: `/${lang}/privacy`,
});
