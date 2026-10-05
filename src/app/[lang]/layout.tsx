import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, localeDir, locales } from "@/i18n/config";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "The Sweet Spot",
  description: "Crêpes, waffles, pancakes, ice cream rolls and more. Tripoli, Lebanon.",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} dir={localeDir(lang)} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
