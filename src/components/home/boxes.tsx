import Image from "next/image";
import Link from "next/link";
import boxCutout from "@/assets/images/box-blue-cutout.png";
import { Heart } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { items } from "@/data/menu";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";
import { formatPriceShort } from "@/lib/money";

type Props = { lang: Locale; t: Dictionary["boxes"] };

export function Boxes({ lang, t }: Props) {
  const r = routes(lang);
  // Every box on the menu, biggest first, so new ones appear here too.
  const rows = items
    .filter((item) => item.category === "boxes")
    .sort((a, b) => b.price - a.price)
    .map((item) => ({
      id: item.id,
      name: item.name[lang],
      note: item.description[lang],
      price: item.price,
      href: r.item(item.id),
    }));

  return (
    <section
      id="boxes"
      className="relative mx-auto grid max-w-[1440px] items-center gap-[clamp(28px,5cqw,80px)] pt-section-sm pb-section desk:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desk:px-[clamp(20px,5cqw,72px)]"
    >
      {/* The cut-out box, slightly tilted, with a soft shadow. */}
      <div className="relative mx-auto aspect-square w-[min(84%,440px)] desk:w-[min(100%,580px)]">
        <Image
          src={boxCutout}
          alt={t.photoAlt}
          sizes="(min-width: 820px) 480px, 70vw"
          className="absolute inset-[4%] size-[92%] -rotate-4 object-contain drop-shadow-[0_28px_26px_rgba(53,37,34,.28)] transition-transform duration-500 ease-soft hover:scale-[1.02] hover:-rotate-1"
        />
      </div>

      <Reveal className="flex flex-col items-start gap-[18px] px-5 desk:px-0" data-motion="always">
        <span className="eyebrow text-blueberry">{t.tag}</span>
        <h2 className="title-section">
          {t.title}
          <Heart className="ms-[0.12em] inline-block size-[0.5em] rotate-12 align-[0.06em]" />
        </h2>
        <p className="hidden max-w-[34ch] font-body text-[clamp(17px,1.3cqw,19px)] leading-normal font-medium text-pretty text-cacao desk:block">
          {t.description}
        </p>
        <div className="mt-2.5 w-full max-w-[520px] border-t-[1.5px] border-chocolate">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex w-full items-center justify-between gap-4 border-b-[1.5px] border-chocolate py-5 transition-colors duration-200 hover:text-blueberry"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-[clamp(22px,1.9cqw,28px)] leading-[1.15] font-black">
                  {row.name}
                </span>
                <span className="line-clamp-1 font-ui text-sm leading-[18px] text-cacao">
                  {row.note}
                </span>
              </span>
              <span className="flex items-center gap-3.5">
                <span className="font-display text-[clamp(22px,1.9cqw,28px)] leading-none font-black">
                  {formatPriceShort(row.price, lang)}
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
