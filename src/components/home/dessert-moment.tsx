import Image from "next/image";
import Link from "next/link";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import { ArrowUpRight } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

type Props = { lang: Locale; t: Dictionary["dessert"] };

/**
 * The one weird moment: a big "dessert" whose full stop is a round photo. The
 * lead line, word and note form one centred block, so the lead starts where
 * the word starts and the note row ends where the photo ends.
 */
export function DessertMoment({ lang, t }: Props) {
  return (
    <section className="relative overflow-hidden bg-blueberry px-5 pt-[72px] pb-16 text-vanilla [--link-hover:var(--color-strawberry-cream)] [--link:var(--color-vanilla)] desk:px-[clamp(20px,5cqw,72px)] desk:pt-[clamp(96px,9cqw,140px)] desk:pb-[clamp(80px,8cqw,120px)]">
      <Reveal className="mx-auto w-fit max-w-full" threshold={0.3} data-motion="always">
        <h2 className="flex flex-col">
          <span className="origin-bottom-left -rotate-3 font-script text-[min(7cqw,40px)] leading-[1.3] font-normal text-strawberry-cream desk:text-[clamp(30px,3.2cqw,46px)] rtl:origin-bottom-right">
            {t.lead}
          </span>
          {/* English: a smaller word with a full stop just taller than its letters, sitting
              on the baseline. Arabic keeps the larger word (it is much shorter). */}
          <span className="pt-[0.14em] font-display text-[19cqw] leading-[0.82] font-black tracking-[-0.06em] whitespace-nowrap desk:text-[18cqw] rtl:pb-[0.12em] rtl:text-[25cqw] rtl:leading-[1.05] desk:rtl:text-[27cqw]">
            {t.word}
            <Image
              src={photoProfiteroles}
              alt={t.photoAlt}
              sizes="(min-width: 820px) 22vw, 22vw"
              className="roll-in ms-[0.08em] inline-block size-[1.05em] rotate-8 rounded-full border-[0.035em] border-vanilla object-cover object-[56%_50%] align-baseline shadow-[0_0.12em_0.24em_-0.1em_rgba(20,40,55,.55)] rtl:size-[0.8em]"
            />
          </span>
        </h2>
        {/* w-0 + min-w-full: matches the word's width without widening the block */}
        <div className="relative z-3 flex w-0 min-w-full flex-wrap items-center justify-end gap-x-7 gap-y-3 pt-[clamp(18px,2cqw,28px)]">
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
