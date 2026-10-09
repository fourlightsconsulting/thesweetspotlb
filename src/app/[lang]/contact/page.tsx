import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactLines } from "@/components/contact/contact-lines";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getOrderingBranch } from "@/server/catalog";

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

/** Contact us: WhatsApp, a call, and the shop's social accounts. */
export default async function Contact({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [t, branch] = await Promise.all([getDictionary(lang), getOrderingBranch()]);

  return <ContactLines lang={lang} t={t.contact} social={t.social} phone={branch.phone} />;
}
