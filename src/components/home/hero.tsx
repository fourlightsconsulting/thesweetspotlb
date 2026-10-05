import Image, { getImageProps } from "next/image";
import Link from "next/link";
import photoIcecream from "@/assets/images/photo-icecream.png";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import photoWaffle from "@/assets/images/photo-waffle.png";
import { ArrowDownLeft, ArrowToButton } from "@/components/doodles";
import { HeroVideo } from "@/components/home/hero-video";
import { Reveal } from "@/components/reveal";
import { heroVideo } from "@/data/site";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

// Until the video arrives: crossfading stills on desktop (18s loop, slow zoom),
// the first still alone on phones. With a video, the first still is its poster.
const reel = [
  { src: photoWaffle, origin: "35% 60%" },
  { src: photoIcecream, origin: "65% 40%" },
  { src: photoProfiteroles, origin: "50% 55%" },
];
const stills = heroVideo ? reel.slice(0, 1) : reel;

// Phones get a 1px blank in place of the extra stills, so they are never fetched.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

type Props = { lang: Locale; t: Dictionary["hero"]; orderNow: string };

/**
 * Phones: a 4:5 media box (capped at 70% of the screen height) with the
 * headline on it, and the order button below on cream. Desktop: full-height
 * media with everything overlaid.
 */
export function Hero({ lang, t, orderNow }: Props) {
  return (
    <section className="relative desk:h-[min(calc(100svh-110px),820px)] desk:min-h-[520px]">
      <div className="relative h-[min(125cqw,70svh)] min-h-[360px] overflow-hidden bg-blueberry text-vanilla desk:absolute desk:inset-0 desk:h-auto desk:min-h-0">
        <div className={`absolute inset-0 ${heroVideo ? "" : "reel"}`}>
          {stills.map((photo, i) => {
            const style = { transformOrigin: photo.origin, animationDelay: `${i * 6 - 1}s` };
            if (i === 0) {
              return (
                <Image
                  key={photo.origin}
                  src={photo.src}
                  alt=""
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="100vw"
                  className="object-cover"
                  style={style}
                />
              );
            }
            const {
              props: { srcSet, ...props },
            } = getImageProps({ src: photo.src, alt: "", fill: true, sizes: "100vw" });
            return (
              <picture key={photo.origin}>
                <source media="(width >= 51.25rem)" srcSet={srcSet} />
                <img
                  {...props}
                  src={BLANK}
                  alt=""
                  className="object-cover"
                  style={{ ...props.style, ...style }}
                />
              </picture>
            );
          })}
          {heroVideo && <HeroVideo desktop={heroVideo.desktop} mobile={heroVideo.mobile} />}
        </div>
        <div className="absolute inset-0 hero-scrim" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-3 awning" />

        <div className="absolute inset-0 z-2 mx-auto flex max-w-[1440px] flex-col items-start justify-end gap-[clamp(16px,1.8cqw,26px)] px-[clamp(20px,5cqw,72px)] pt-[72px] pb-5 desk:pb-[clamp(24px,5cqw,88px)]">
          <h1 className="rise flex flex-col font-display text-[clamp(44px,13.6cqw,84px)] leading-[0.92] font-black tracking-[-0.03em] text-shadow-[0_2px_28px_rgba(20,40,55,.35)] desk:text-[clamp(54px,7.6cqw,124px)]">
            <span>{t.line1}</span>
            <span>{t.line2}</span>
            <span className="text-strawberry-cream">{t.line3}</span>
          </h1>
          <p className="rise hidden max-w-[32ch] font-body text-[clamp(18px,1.6cqw,22px)] leading-[1.45] font-medium text-pretty [animation-delay:120ms] desk:block">
            {t.lead}
          </p>

          {/* Desktop: button with a hand-written note pointing back at it */}
          <Reveal className="mt-1 hidden items-center gap-1 [--draw-delay:.7s] desk:flex">
            <Link href={routes(lang).order} className="btn btn-light btn-xl">
              {orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
            </Link>
            <ArrowToButton className="ms-3 -mt-10 h-11 w-[72px] stroke-vanilla rtl:-scale-x-100" />
            <span
              aria-hidden="true"
              className="-mt-16 -rotate-5 font-script text-2xl leading-[1.2] whitespace-nowrap text-shadow-[0_1px_14px_rgba(20,40,55,.5)]"
            >
              {t.note}
            </span>
          </Reveal>
        </div>
      </div>

      {/* Mobile: note above a full-width button, on cream below the video */}
      <div className="mx-auto w-full max-w-[500px] px-5 pb-7 desk:hidden">
        <div className="flex items-end justify-end text-blueberry" aria-hidden="true">
          <ArrowDownLeft className="mb-1 h-[38px] w-10 stroke-current rtl:-scale-x-100" />
          <span className="mb-[22px] -rotate-4 font-script text-[19px] leading-[1.2] whitespace-nowrap">
            {t.note}
          </span>
        </div>
        <Link href={routes(lang).order} className="btn btn-primary btn-lg w-full">
          {orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>
      </div>
    </section>
  );
}
