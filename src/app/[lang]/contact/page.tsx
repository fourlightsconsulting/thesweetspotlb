import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactLines } from "@/components/contact/contact-lines";
import { Locations } from "@/components/home/locations";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getBranches, ORDERING_BRANCH } from "@/server/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { contact } = await getDictionary(lang);
  return {
    title: contact.metaTitle,
    description: contact.metaDescription,
    alternates: { languages: { en: "/en/contact", ar: "/ar/contact" } },
  };
}

/** Contact & locations: the home page's locations, then how to reach us. */
export default async function Contact({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [t, branches] = await Promise.all([getDictionary(lang), getBranches()]);
  const branch = (slug: string) => branches.find((b) => b.slug === slug) ?? branches[0];

  return (
    <>
      <Locations
        lang={lang}
        t={t.locations}
        orderNow={t.common.orderNow}
        hours={{ tripoli: branch(ORDERING_BRANCH).schedule, kaslik: branch("kaslik").schedule }}
        heading="h1"
        className="pt-[clamp(28px,3.4cqw,52px)] pb-section"
      />
      <ContactLines lang={lang} t={t.contact} phone={branch(ORDERING_BRANCH).phone} />
    </>
  );
}
