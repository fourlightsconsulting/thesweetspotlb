import Image from "next/image";
import Link from "next/link";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import { ArrowUpRight } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

type Props = { lang: Locale; t: Dictionary["dessert"] };

/** The one weird moment: an enormous "dessert" whose full stop is a round photo. */
export function DessertMoment({ lang, t }: Props) {
  return (
    <section className="relative overflow-hidden bg-blueberry pt-[72px] pb-16 text-vanilla [--link-hover:var(--color-strawberry-cream)] [--link:var(--color-vanilla)] desk:pt-[clamp(96px,9cqw,140px)] desk:pb-[clamp(80px,8cqw,120px)]">
      <Reveal className="relative mx-auto max-w-[1440px]" threshold={0.3} data-motion="always">
        <h2 className="flex flex-col">
          <span className="-rotate-3 px-[clamp(20px,5cqw,72px)] font-script text-[min(8cqw,44px)] leading-[1.3] font-normal text-strawberry-cream desk:text-[clamp(30px,3.2cqw,46px)]">
            {t.lead}
          </span>
          <span className="ps-[clamp(14px,4cqw,60px)] pt-[0.14em] font-display text-[25cqw] leading-[0.82] font-black tracking-[-0.06em] whitespace-nowrap desk:text-[27cqw] rtl:pb-[0.12em] rtl:leading-[1.05]">
            {t.word}
            <Image
              src={photoProfiteroles}
              alt={t.photoAlt}
              sizes="(min-width: 820px) 17vw, 16vw"
              className="roll-in ms-[0.1em] inline-block size-[0.62em] rotate-8 rounded-full object-cover object-[56%_50%] align-[-0.05em] shadow-[0_24px_40px_-22px_rgba(53,37,34,.6)]"
            />
          </span>
        </h2>
        <div className="relative z-3 flex flex-wrap items-center justify-end gap-x-7 gap-y-4 px-[clamp(20px,5cqw,72px)] pt-[clamp(18px,2cqw,28px)]">
          <div aria-hidden="true" className="flex items-center gap-1 text-strawberry-cream">
            <span className="-rotate-3 font-script text-[clamp(19px,1.6cqw,24px)] leading-[1.25]">
              {t.note}
            </span>
            <ArrowUpRight className="h-10 w-[52px] stroke-current rtl:-scale-x-100" />
          </div>
          <Link href={routes(lang).category("bakes")} className="text-link">
            {t.link} <span aria-hidden="true">{forwardArrow(lang)}</span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
