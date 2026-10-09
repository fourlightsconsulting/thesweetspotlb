import { notFound } from "next/navigation";
import { Boxes } from "@/components/home/boxes";
import { Categories } from "@/components/home/categories";
import { DessertMoment } from "@/components/home/dessert-moment";
import { Hero } from "@/components/home/hero";
import { Instagram } from "@/components/home/instagram";
import { Locations } from "@/components/home/locations";
import { Reviews } from "@/components/home/reviews";
import { Ticker } from "@/components/home/ticker";
import { WeeklySpecial } from "@/components/home/weekly-special";
import { WEEKLY_SPECIAL_ID } from "@/data/menu";
import { instagramPosts, sampleReviews } from "@/data/social";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getBranches, getMenu, getSiteSettings, ORDERING_BRANCH } from "@/server/catalog";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [t, menu, branches, settings] = await Promise.all([
    getDictionary(lang),
    getMenu(),
    getBranches(),
    getSiteSettings(),
  ]);

  const special = menu.items.find((item) => item.id === WEEKLY_SPECIAL_ID);
  const tripoli = branches.find((b) => b.slug === ORDERING_BRANCH) ?? branches[0];
  const ticker = settings.homeTicker;

  return (
    <>
      <Hero lang={lang} t={t.hero} orderNow={t.common.orderNow} />
      {ticker.enabled && <Ticker words={ticker.phrases.map((phrase) => phrase[lang])} />}
      <Categories lang={lang} t={t.categories} from={t.common.from} menu={menu} />
      {special && <WeeklySpecial lang={lang} t={t.special} item={special} />}
      <Boxes lang={lang} t={t.boxes} items={menu.items} />
      <DessertMoment lang={lang} t={t.dessert} />
      <Reviews reviews={sampleReviews} t={t.reviews} rtl={lang === "ar"} />
      <Instagram posts={instagramPosts} t={t.instagram} />
      <Locations
        lang={lang}
        t={t.locations}
        orderNow={t.common.orderNow}
        hours={tripoli.schedule}
      />
    </>
  );
}
