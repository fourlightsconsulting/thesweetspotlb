import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { locales } from "@/i18n/config";
import { routes } from "@/i18n/routes";

// The public pages in both languages, for search engines (submitted in
// Search Console). Checkout and placed orders are per visitor, so left out.
const pages = ["home", "order", "about", "contact", "privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (lang: (typeof locales)[number], page: (typeof pages)[number]) =>
    `${site.url}${routes(lang)[page]}`;
  return pages.flatMap((page) =>
    locales.map((lang) => ({
      url: url(lang, page),
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, url(l, page)])) },
    })),
  );
}
