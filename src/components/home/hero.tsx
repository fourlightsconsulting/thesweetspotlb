import Image from "next/image";
import Link from "next/link";
import front from "@/assets/images/hero-waffles-front.png";
import photo from "@/assets/images/hero-waffles.jpg";
import { ArrowUpLeft } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

type Props = { lang: Locale; t: Dictionary["hero"]; orderNow: string };

/**
 * Waffles getting a chocolate pour, on a dusty pink wall and a pink table. The
 * photo sits at the inline end and its two pinks carry on in CSS behind the
 * words (hero-pinks). The headline sits between the photo and its front layer
 * (hand, jug, pour), so the pour passes in front of the words. Phones slide the
 * photo (--dx) so the jug clears the headline; Arabic mirrors the scene.
 */
export function Hero({ lang, t, orderNow }: Props) {
  const ar = lang === "ar";
  const { lead, first, join, last } = t.title;

  return (
    <section className="relative h-[clamp(500px,150vw,600px)] overflow-hidden [--dx:14.8%] hero-pinks desk:h-[min(calc(100svh-110px),760px)] desk:min-h-[520px] desk:[--dx:0%]">
      <Image
        src={photo}
        alt=""
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 820px) 1200px, 940px"
        className="hero-layer z-1 w-auto hero-mirror [mask-image:linear-gradient(to_right,transparent_3%,#000_14%)]"
      />

      <div className="absolute inset-0 z-2 mx-auto grid max-w-[1440px] grid-rows-[60%_40%] px-5 desk:px-[clamp(20px,5cqw,72px)]">
        {/* Phones: words at the top of the wall. Desktop: just above the table. */}
        <div className="self-start pt-[54px] desk:self-end desk:pt-0 desk:pb-[2.4%]">
          <h1
            className={`rise mb-[0.4em] font-script ${ar ? "text-[clamp(46px,12.5vw,66px)] leading-[1.15] font-bold desk:text-[clamp(80px,8.6vw,150px)] desk:leading-[1.1]" : "text-[clamp(40px,11.2vw,60px)] leading-[0.95] font-normal desk:text-[clamp(84px,10vw,168px)]"}`}
          >
            {/* One lockup: a small word tucked into the top corner of the
                first big word, a small blue one after it, and the second big
                word starting further out and tucked up underneath. */}
            <span className={`relative block text-paper ${lead ? "ps-[0.5em]" : ""}`}>
              {lead && (
                <>
                  <small className="absolute start-[0.05em] top-[0.22em] text-[0.42em]">
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
          <p
            className={`rise text-ink [animation-delay:120ms] ${ar ? "font-ui text-[clamp(15px,4.2vw,18px)] font-medium desk:text-[clamp(20px,2.1vw,30px)]" : "font-display text-[clamp(13px,3.7vw,16px)] leading-[1.3] font-semibold tracking-[0.06em] uppercase desk:text-[clamp(17px,1.7vw,25px)]"}`}
          >
            {t.tagline}
          </p>
        </div>

        {/* The button stands on the table. */}
        <div className="self-end pb-10 desk:self-start desk:pt-[3.6%] desk:pb-0">
          <Link href={routes(lang).order} className="btn btn-primary btn-xl">
            {orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
          </Link>
        </div>
      </div>

      <Image
        src={front}
        alt=""
        loading="eager"
        sizes="(min-width: 820px) 1200px, 940px"
        className="pointer-events-none hero-layer z-3 w-auto hero-mirror"
      />

      {/* Desktop: a hand-written note under the plate, pointing up at it. It
          rides on a photo-sized layer, so it stays under the plate at every
          width. (Phones keep the button there instead.) */}
      <div aria-hidden="true" className="pointer-events-none hero-layer z-3 hidden desk:block">
        <Reveal className="absolute start-[57%] top-[85.5%] flex items-start text-raspberry [--draw-delay:.7s]">
          <span
            className={`mt-2.5 -rotate-4 font-script whitespace-nowrap ${ar ? "text-[clamp(18px,1.6vw,22px)] font-semibold" : "text-[clamp(20px,1.8vw,26px)] leading-[1.2]"}`}
          >
            {t.note}
          </span>
          <ArrowUpLeft className="ms-0.5 -mt-7.5 h-[45px] w-[50px] stroke-current rtl:-scale-x-100" />
        </Reveal>
      </div>

      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-4 awning" />
    </section>
  );
}
