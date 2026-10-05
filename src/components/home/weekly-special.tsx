import Image from "next/image";
import Link from "next/link";
import cup from "@/assets/images/cutout-icecream-cup.png";
import { ArrowUpLeft, Rays } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { formatPrice, getItem, WEEKLY_SPECIAL_ID } from "@/data/menu";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

type Props = { lang: Locale; t: Dictionary["special"] };

/**
 * Cotton Candy band with a cut-out cup that breaks ~120px above the band into
 * the pink category section. The category section's bottom padding leaves room.
 */
export function WeeklySpecial({ lang, t }: Props) {
  const href = routes(lang).item(WEEKLY_SPECIAL_ID);
  const price = formatPrice(getItem(WEEKLY_SPECIAL_ID).price);

  return (
    <section id="special" className="relative overflow-x-clip bg-cotton-candy text-chocolate">
      <Reveal className="mx-auto grid max-w-[1440px] desk:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] desk:items-center desk:px-[clamp(20px,5cqw,72px)] desk:py-[clamp(72px,6.4cqw,104px)]">
        <div className="relative z-3 flex flex-col items-start gap-3.5 px-5 pb-16 desk:gap-[clamp(18px,1.8cqw,26px)] desk:p-0">
          <span className="eyebrow">{t.tag}</span>
          <h2 className="font-display text-[16.5cqw] leading-[0.88] font-black tracking-[-0.04em] text-balance desk:text-[clamp(64px,9cqw,136px)]">
            {t.title}
          </h2>
          <p className="mt-1 font-body text-[17px] leading-normal font-medium text-pretty desk:mt-2 desk:max-w-[30ch] desk:text-[clamp(17px,1.35cqw,20px)]">
            {t.description}
          </p>
          <Link href={href} className="btn btn-primary btn-lg mt-1.5 w-full desk:w-auto">
            {t.cta} <span aria-hidden="true">{forwardArrow(lang)}</span>
          </Link>
        </div>

        <div className="relative order-first h-[200px] desk:order-none desk:h-auto desk:min-h-[380px] desk:self-stretch">
          <div className="absolute end-[-9%] -top-[110px] z-2 aspect-[459/515] w-[74%] desk:end-[2%] desk:top-[calc(-1*(clamp(72px,6.4cqw,104px)+clamp(96px,8.5cqw,128px)))] desk:w-[min(100%,36cqw)]">
            <div className="float size-full">
              <Image
                src={cup}
                alt={t.cupAlt}
                sizes="(min-width: 820px) 36vw, 74vw"
                className="size-full rotate-6 drop-shadow-[0_28px_22px_rgba(36,91,120,.5)] desk:rotate-5 desk:drop-shadow-[0_40px_34px_rgba(36,91,120,.5)]"
              />
            </div>

            <Link
              href={href}
              aria-label={`${t.limited} ${price}`}
              className="absolute -start-[14%] bottom-[4%] flex size-[92px] -rotate-12 flex-col items-center justify-center gap-px rounded-full border-[2.5px] border-chocolate bg-toffee text-chocolate shadow-[3px_3px_0_var(--color-chocolate)] transition-transform duration-300 ease-soft hover:scale-105 hover:rotate-4 desk:-start-[7%] desk:bottom-[6%] desk:size-[clamp(104px,9cqw,132px)] desk:gap-0.5 desk:shadow-[3px_4px_0_var(--color-chocolate)]"
            >
              <span className="font-ui text-[10px] leading-3 font-bold tracking-[0.05em] uppercase desk:text-[11px] desk:leading-[14px] desk:tracking-[0.06em]">
                {t.limited}
              </span>
              <span className="font-display text-[26px] leading-none font-black desk:text-[clamp(28px,2.4cqw,36px)]">
                {price}
              </span>
            </Link>

            <Rays className="absolute start-[2%] -top-[9%] size-11 stroke-blueberry desk:start-[1%] desk:-top-[5%] desk:size-[60px] rtl:-scale-x-100" />

            <div
              aria-hidden="true"
              className="absolute -end-[2%] top-full hidden items-start gap-0.5 desk:flex"
            >
              <ArrowUpLeft className="h-[46px] w-[50px] stroke-chocolate rtl:-scale-x-100" />
              <span className="mt-6 max-w-[13ch] -rotate-3 font-script text-[22px] leading-[1.25]">
                {t.note}
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
