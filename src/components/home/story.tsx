import Image from "next/image";
import photoShop from "@/assets/images/photo-shop.png";
import { ArrowSweepRight } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import type { Dictionary } from "@/i18n/dictionaries/en";

const polaroid =
  "absolute m-0 rounded-[2px] bg-whipped shadow-[0_1px_2px_rgba(53,37,34,.12),0_22px_36px_-22px_rgba(53,37,34,.55)] desk:shadow-[0_1px_2px_rgba(53,37,34,.12),0_26px_44px_-26px_rgba(53,37,34,.55)]";
const tape = "absolute h-6 bg-vanilla/78 desk:h-7";
// Stand-in frames until the real behind-the-scenes photos arrive.
const placeholder =
  "flex w-full items-center justify-center bg-strawberry-milk p-3 text-center font-mono text-[10px] leading-normal text-cacao [direction:ltr] desk:p-4 desk:text-[11px]";

type Props = { t: Dictionary["story"] };

/**
 * Text (2a) beside a taped Polaroid collage (3a). The two lower Polaroids hang
 * past the band into the next section, which leaves room for them.
 */
export function Story({ t }: Props) {
  return (
    <section id="story" className="relative z-1 bg-strawberry-cream">
      <Reveal className="mx-auto grid max-w-[1440px] items-start desk:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] desk:gap-[clamp(40px,5cqw,80px)] desk:px-[clamp(20px,5cqw,72px)] desk:pt-[clamp(88px,8cqw,128px)] desk:pb-[clamp(64px,6cqw,96px)]">
        <div className="flex flex-col items-start gap-[clamp(14px,1.4cqw,20px)] px-5 pt-[72px] desk:px-0 desk:pt-6">
          <span className="eyebrow text-blueberry">{t.tag}</span>
          <h2 className="font-display text-[clamp(36px,4.4cqw,68px)] leading-[1.02] font-black tracking-[-0.025em] text-balance">
            {t.title}
          </h2>
          <p className="max-w-[40ch] font-body text-[clamp(16px,1.3cqw,18px)] leading-[1.6] text-pretty">
            {t.body}
          </p>
        </div>

        {/* Phones: the collage keeps its 375×330 proportions, caps at 520px wide and
            stays fully on screen. */}
        <div className="relative mx-auto mt-11 aspect-[375/330] w-full max-w-[520px] desk:mx-0 desk:mt-0 desk:aspect-auto desk:h-[clamp(440px,37cqw,540px)] desk:max-w-none">
          <figure
            className={`${polaroid} end-[4%] top-0 z-1 w-[74%] -rotate-3 p-2.5 pb-9 desk:end-0 desk:-rotate-[2.5deg] desk:p-3 desk:pb-[46px]`}
          >
            <Image
              src={photoShop}
              alt={t.shopAlt}
              sizes="(min-width: 820px) 40vw, 80vw"
              className="aspect-[4/3] w-full object-cover"
            />
            <span
              aria-hidden="true"
              className={`${tape} -top-[13px] left-1/2 w-24 -translate-x-1/2 -rotate-4 desk:-top-[15px] desk:w-[118px]`}
            />
          </figure>

          <div
            aria-hidden="true"
            className="absolute start-[4%] top-[7%] z-3 flex flex-col items-start text-blueberry desk:-start-[2%] desk:top-[2%]"
          >
            <span className="-rotate-8 font-script text-2xl leading-[1.2] desk:text-[clamp(28px,2.4cqw,36px)]">
              {t.place}
            </span>
            <ArrowSweepRight className="ms-[22px] h-8 w-[46px] stroke-current desk:ms-[34px] desk:h-[46px] desk:w-[74px] rtl:-scale-x-100" />
          </div>

          <figure
            className={`${polaroid} start-[5%] -bottom-[26%] z-2 w-[48%] rotate-4 p-2 pb-[30px] desk:start-[2%] desk:-bottom-[150px] desk:w-[42%] desk:p-2.5 desk:pb-10`}
          >
            <div className={`${placeholder} aspect-[4/5]`}>Real photo · waffle iron mid-pour</div>
            <span
              aria-hidden="true"
              className={`${tape} -start-3.5 -top-[9px] w-[70px] -rotate-[34deg] desk:-start-[18px] desk:-top-2.5 desk:w-[88px]`}
            />
          </figure>

          <figure
            className={`${polaroid} start-[47%] -bottom-[190px] z-2 hidden w-[35%] -rotate-3 p-2.5 pb-10 desk:block`}
          >
            <div className={`${placeholder} aspect-square`}>
              Real photo · the team behind the counter
            </div>
          </figure>
        </div>
      </Reveal>
    </section>
  );
}
