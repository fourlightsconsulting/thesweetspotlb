import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

// Order refs are made at checkout, so this page renders on request.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/orders/[ref]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { confirmation } = await getDictionary(lang);
  return { title: confirmation.metaTitle, robots: { index: false } };
}

export default async function OrderPlacedPage({ params }: PageProps<"/[lang]/orders/[ref]">) {
  const { lang, ref } = await params;
  if (!hasLocale(lang) || !/^[0-9a-f-]{36}$/.test(ref)) notFound();
  const t = await getDictionary(lang);

  return <OrderConfirmation lang={lang} orderRef={ref} t={t.confirmation} />;
}
