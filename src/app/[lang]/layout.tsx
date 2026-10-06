import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasLocale, localeDir, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fontVariables } from "../fonts";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { meta } = await getDictionary(lang);
  return {
    title: { default: meta.title, template: meta.titleTemplate },
    description: meta.description,
    alternates: { languages: { en: "/en", ar: "/ar" } },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={localeDir(lang)}
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Lets CSS hide scroll-reveal content only when JS will reveal it. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body className="min-h-full">
        <div className="page flex min-h-full flex-col overflow-x-clip">
          <SiteHeader
            lang={lang}
            nav={dict.nav}
            menu={{
              orderNow: dict.common.orderNow,
              branch: dict.locations.tripoli,
              hours: [
                `${dict.locations.monThu} · ${dict.locations.tripoliWeekHours}`,
                `${dict.locations.friSun} · ${dict.locations.tripoliWeekendHours}`,
              ],
              follow: dict.instagram.follow,
            }}
          />
          <main className="flex-1">{children}</main>
          <SiteFooter lang={lang} dict={dict} />
        </div>
      </body>
    </html>
  );
}
