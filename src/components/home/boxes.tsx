import Image from "next/image";
import Link from "next/link";
import boxCutout from "@/assets/images/box-cutout.webp";
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
      className="relative mx-auto grid max-w-[1440px] items-center gap-[clamp(28px,5cqw,80px)] pt-[clamp(48px,6cqw,96px)] pb-[clamp(64px,7cqw,112px)] desk:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desk:px-[clamp(20px,5cqw,72px)]"
    >
      {/* The cut-out box, tilted, on a soft pink blob. */}
      <div className="relative mx-auto aspect-square w-[min(84%,440px)] desk:w-[min(100%,580px)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          className="absolute -inset-[16.5%] size-[133%] translate-x-[3%] translate-y-[3%] fill-strawberry-cream rtl:-translate-x-[3%]"
        >
          <path
            transform="translate(100 100)"
            d="M48.7-63.4C61.8-53.1 70.1-36.6 74.1-19.2 78.1-1.8 77.8 16.4 70.2 30.9 62.6 45.4 47.7 56.1 31.6 63.8 15.5 71.5-1.8 76.2-19.6 73.8-37.4 71.4-55.7 61.9-66.6 46.7-77.5 31.5-81 10.6-77.4-8.4-73.8-27.4-63.1-44.5-48.5-54.9-33.9-65.3-17-69 .6-69.8 18.2-70.6 35.6-73.7 48.7-63.4Z"
          />
        </svg>
        <Image
          src={boxCutout}
          alt={t.photoAlt}
          sizes="(min-width: 820px) 480px, 70vw"
          className="absolute inset-[11%] size-[78%] -rotate-4 object-contain drop-shadow-[0_28px_26px_rgba(53,37,34,.28)] transition-transform duration-500 ease-soft hover:scale-[1.02] hover:-rotate-1"
        />
      </div>

      <Reveal className="flex flex-col items-start gap-[18px] px-5 desk:px-0" data-motion="always">
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
