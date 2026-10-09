import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/data/site";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { privacy } = await getDictionary(lang);
  return {
    title: privacy.title,
    description: privacy.description,
    alternates: { languages: { en: "/en/privacy", ar: "/ar/privacy" } },
  };
}

export default async function Privacy({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { privacy: t } = await getDictionary(lang);

  return (
    <div className="shell pt-[clamp(28px,3.4cqw,52px)] pb-section">
      <div className="flex max-w-[760px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="title-section">{t.title}</h1>
          <p className="font-ui text-sm text-cacao">{t.updated}</p>
          <p className="font-body text-lg leading-relaxed text-pretty">{t.intro}</p>
        </header>
        {t.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.01em]">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="font-body text-base leading-relaxed text-pretty">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <a
          href={site.instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary self-start"
        >
          {t.contact}
        </a>
      </div>
    </div>
  );
}
