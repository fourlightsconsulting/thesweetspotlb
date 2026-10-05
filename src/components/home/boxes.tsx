import Image from "next/image";
import Link from "next/link";
import photoBoxLarge from "@/assets/images/photo-box-large.png";
import { Heart } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { formatPriceShort, getItem, PARTY_BOX_EXTRA } from "@/data/menu";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

type Props = { lang: Locale; t: Dictionary["boxes"] };

export function Boxes({ lang, t }: Props) {
  const r = routes(lang);
  const box = getItem("box");
  const rows = [
    { name: t.regular, serves: t.regularServes, price: box.price, href: r.item("box") },
    {
      name: t.party,
      serves: t.partyServes,
      price: box.price + PARTY_BOX_EXTRA,
      href: r.item("box", { boxsize: "party" }),
    },
  ];

  return (
    <section
      id="boxes"
      className="relative mx-auto mt-[clamp(110px,11cqw,180px)] grid max-w-[1440px] items-center gap-[clamp(32px,6cqw,96px)] desk:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      {/* Desktop: bleeds to the start edge. Mobile: 4:5 crop hugging the end edge. */}
      <Image
        src={photoBoxLarge}
        alt={t.photoAlt}
        sizes="(min-width: 820px) 56vw, min(84vw, 520px)"
        className="ms-auto aspect-[4/5] w-[84%] max-w-[520px] object-cover object-[42%_55%] desk:ms-0 desk:aspect-[6/5] desk:w-full desk:max-w-none desk:object-[50%_60%]"
      />

      <Reveal className="flex flex-col items-start gap-[18px] px-5 desk:ps-0 desk:pe-[clamp(20px,5cqw,72px)]">
        <span className="eyebrow text-blueberry">{t.tag}</span>
        <h2 className="font-display text-[clamp(46px,5.6cqw,84px)] leading-[0.95] font-black tracking-[-0.035em] text-balance">
          {t.title}
          <Heart className="ms-[0.12em] inline-block size-[0.5em] rotate-12 align-[0.06em]" />
        </h2>
        <p className="hidden max-w-[34ch] font-body text-[clamp(17px,1.3cqw,19px)] leading-normal font-medium text-pretty text-cacao desk:block">
          {t.description}
        </p>
        <div className="mt-2.5 w-full max-w-[520px] border-t-[1.5px] border-chocolate">
          {rows.map((row) => (
            <Link
              key={row.name}
              href={row.href}
              className="flex w-full items-center justify-between gap-4 border-b-[1.5px] border-chocolate py-5 transition-colors duration-200 hover:text-blueberry"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-display text-[clamp(22px,1.9cqw,28px)] leading-[1.15] font-black">
                  {row.name}
                </span>
                <span className="font-ui text-sm leading-[18px] text-cacao">{row.serves}</span>
              </span>
              <span className="flex items-center gap-3.5">
                <span className="font-display text-[clamp(22px,1.9cqw,28px)] leading-none font-black">
                  {formatPriceShort(row.price)}
                </span>
                <span aria-hidden="true" className="font-ui text-xl font-bold text-blueberry">
                  {forwardArrow(lang)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
