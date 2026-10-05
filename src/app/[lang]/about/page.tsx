import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Story } from "@/components/about/story";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { story } = await getDictionary(lang);
  return {
    title: story.tag,
    description: story.body,
    alternates: { languages: { en: "/en/about", ar: "/ar/about" } },
  };
}

export default async function About({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    // Bottom room for the Polaroids that hang below the pink band.
    <div className="pb-[clamp(150px,14cqw,220px)]">
      <Story t={t.story} />
    </div>
  );
}
