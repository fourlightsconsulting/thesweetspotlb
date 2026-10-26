import Image from "next/image";
import Link from "next/link";
import waffles from "@/assets/images/hero-waffle-stack.webp";
import { HomeSticker } from "@/components/home/sticker";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

type Props = { lang: Locale; t: Dictionary["hero"]; orderNow: string };

/** Desktop enlarges the food and crops the hand; phones keep the full scene. */
export function Hero({ lang, t, orderNow }: Props) {
  const ar = lang === "ar";
  const { lead, first, join, last } = t.title;

  return (
    <section className="relative overflow-hidden hero-pinks">
      <div className="relative grid h-[clamp(500px,150vw,600px)] sm:h-auto sm:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] sm:items-center sm:gap-0 sm:pt-12 sm:pb-8 desk:mx-auto desk:max-w-[1440px] desk:grid-cols-2 desk:gap-4 desk:px-[clamp(20px,5cqw,72px)] desk:py-12">
        <div className="absolute inset-0 z-2 flex flex-col items-start px-5 pt-[54px] pb-10 text-start sm:relative sm:inset-auto sm:ps-[max(24px,calc((100vw-1440px)/2+72px))] sm:pe-5 sm:pt-0 sm:pb-0 desk:p-0">
          <div className="relative">
            <h1
              className={`font-script ${ar ? "text-[clamp(46px,12.5vw,66px)] leading-[1.15] font-bold desk:text-[clamp(84px,9vw,138px)] desk:leading-[1.1]" : "text-[clamp(36px,11.2vw,60px)] leading-[0.95] font-normal desk:text-[clamp(88px,10vw,150px)]"}`}
            >
              <span className={`relative block text-paper ${lead ? "ps-[0.5em]" : ""}`}>
                {lead && (
                  <>
                    <small className="absolute start-[0.3em] top-[0.08em] text-[0.58em]">
                      {lead}
                    </small>{" "}
                  </>
                )}
                {first}
                {join && (
                  <>
                    {" "}
                    <small className="ms-[0.2em] text-[0.42em] text-blueberry">{join}</small>
                  </>
                )}
              </span>{" "}
              <span className={`block text-blueberry ${ar ? "-mt-[0.1em]" : "-mt-[0.26em]"}`}>
                {last}
              </span>
            </h1>
            <HomeSticker
              name="cherry"
              float
              className={`absolute end-[28%] top-[calc(100%+52px)] z-3 w-[96px] -rotate-11 sm:-end-28 sm:top-[calc(100%+8px)] desk:w-[128px] xl:w-[144px] ${ar ? "desk:-end-[160px] desk:top-[25%] xl:-end-[176px]" : "desk:end-0 desk:top-[calc(100%+112px)] xl:end-[6%]"}`}
            />
          </div>
          <p
            className={`mt-4 text-ink max-[360px]:max-w-[165px] desk:mt-16 ${ar ? "font-ui text-[clamp(15px,4.2vw,18px)] font-medium desk:text-[clamp(20px,2.1vw,30px)]" : "font-display text-[clamp(13px,3.7vw,16px)] leading-[1.3] font-semibold tracking-[0.06em] uppercase desk:text-[clamp(17px,1.7vw,25px)]"}`}
          >
            {t.tagline}
          </p>
          <Link
            href={routes(lang).order}
            className="btn btn-primary btn-lg mt-auto sm:mt-6 desk:mt-8"
          >
            {orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
          </Link>
        </div>

        <div className="pointer-events-none absolute -end-[20vw] top-[33px] aspect-[1312/1199] h-[76%] w-auto sm:relative sm:end-auto sm:top-auto sm:h-auto sm:w-full sm:max-w-[940px] sm:justify-self-end desk:max-w-[560px]">
          <Image
            src={waffles}
            alt=""
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 820px) 645px, (min-width: 640px) 55vw, 100vw"
            className="relative z-1 h-auto w-full hero-mirror desk:absolute desk:end-[6%] desk:-top-[12%] desk:w-[115%] desk:max-w-none"
          />
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-4 awning" />
    </section>
  );
}
