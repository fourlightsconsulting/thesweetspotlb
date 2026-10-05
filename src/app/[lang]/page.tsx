import { Boxes } from "@/components/home/boxes";
import { Categories } from "@/components/home/categories";
import { DessertMoment } from "@/components/home/dessert-moment";
import { Hero } from "@/components/home/hero";
import { Instagram } from "@/components/home/instagram";
import { Locations } from "@/components/home/locations";
import { Reviews } from "@/components/home/reviews";
import { Ticker } from "@/components/home/ticker";
import { WeeklySpecial } from "@/components/home/weekly-special";
import { instagramPosts, sampleReviews } from "@/data/social";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <>
      <Hero lang={lang} t={t.hero} orderNow={t.common.orderNow} />
      <Ticker words={t.ticker} />
      <Categories lang={lang} t={t.categories} from={t.common.from} />
      <WeeklySpecial lang={lang} t={t.special} />
      <Boxes lang={lang} t={t.boxes} />
      <DessertMoment lang={lang} t={t.dessert} />
      <Reviews reviews={sampleReviews} t={t.reviews} rtl={lang === "ar"} />
      <Instagram posts={instagramPosts} t={t.instagram} />
      <Locations lang={lang} t={t.locations} orderNow={t.common.orderNow} />
    </>
  );
}
