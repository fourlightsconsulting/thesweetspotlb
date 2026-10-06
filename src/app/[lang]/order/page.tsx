import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderView } from "@/components/order/order-view";
import { menu } from "@/data/menu";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/order">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { order } = await getDictionary(lang);
  return {
    title: order.metaTitle,
    description: order.metaDescription,
    alternates: { languages: { en: "/en/order", ar: "/ar/order" } },
  };
}

export default async function Order({ params }: PageProps<"/[lang]/order">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { order } = await getDictionary(lang);

  return <OrderView lang={lang} t={order} menu={menu} />;
}
