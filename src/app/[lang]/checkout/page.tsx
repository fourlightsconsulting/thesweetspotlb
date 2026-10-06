import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { menu } from "@/data/menu";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { checkout } = await getDictionary(lang);
  return { title: checkout.metaTitle, robots: { index: false } };
}

export default async function Checkout({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return <CheckoutView lang={lang} t={t.checkout} order={t.order} menu={menu} />;
}
