import { getImageProps } from "next/image";
import Link from "next/link";
import heroMobilePoster from "@/assets/images/hero-mobile-poster.jpg";
import photoIcecream from "@/assets/images/photo-icecream.png";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import photoWaffle from "@/assets/images/photo-waffle.png";
import { ArrowToButton } from "@/components/doodles";
import { HeroVideo } from "@/components/home/hero-video";
import { Reveal } from "@/components/reveal";
import { heroVideo } from "@/data/site";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

// Desktop: crossfading stills (18s loop, slow zoom) until a landscape clip
// arrives. Phones: the video's poster frame, then the video itself.
const reel = [
  { src: photoWaffle, origin: "35% 60%" },
  { src: photoIcecream, origin: "65% 40%" },
  { src: photoProfiteroles, origin: "50% 55%" },
];

// Phones get a 1px blank in place of the desktop-only stills, so they are never fetched.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const DESKTOP = "(width >= 51.25rem)";

const imageProps = (src: typeof photoWaffle, priority = false) =>
  getImageProps({
    src,
    alt: "",
    fill: true,
    sizes: "100vw",
    ...(priority ? ({ loading: "eager", fetchPriority: "high" } as const) : {}),
  }).props;

type Props = { lang: Locale; t: Dictionary["hero"]; orderNow: string };

/**
 * Phones: a 4:5 video box with only the order button on it; the ticker below
 * overlaps its bottom edge with its scallops. The H1 is kept for search and
 * screen readers but hidden visually. Desktop: full-height stills with the
 * headline and button overlaid.
 */
export function Hero({ lang, t, orderNow }: Props) {
  const poster = imageProps(heroMobilePoster, true);

  return (
    <section className="relative desk:h-[min(calc(100svh-110px),820px)] desk:min-h-[520px]">
      <div className="relative h-[min(125cqw,70svh)] min-h-[360px] overflow-hidden bg-blueberry desk:absolute desk:inset-0 desk:h-auto desk:min-h-0">
        <div className="reel absolute inset-0">
          {reel.map((photo, i) => {
            const desktop = imageProps(photo.src);
            // The first slot doubles as the phone poster; the rest are desktop-only.
            const fallback = i === 0 ? poster : { ...desktop, src: BLANK, srcSet: undefined };
            return (
              <picture key={photo.origin}>
                <source media={DESKTOP} srcSet={desktop.srcSet} sizes={desktop.sizes} />
                <img
                  {...fallback}
                  alt=""
                  className="object-cover"
                  style={{
                    ...fallback.style,
                    transformOrigin: photo.origin,
                    animationDelay: `${i * 6 - 1}s`,
                  }}
                />
              </picture>
            );
          })}
        </div>
        {heroVideo && <HeroVideo {...heroVideo} />}
        <div className="absolute inset-0 hidden hero-scrim desk:block" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-3 awning" />
      </div>

      <div className="absolute inset-0 z-2 mx-auto flex max-w-[1440px] flex-col items-center justify-end px-5 pb-11 text-vanilla desk:items-start desk:gap-[clamp(16px,1.8cqw,26px)] desk:px-[clamp(20px,5cqw,72px)] desk:pt-[72px] desk:pb-[clamp(24px,5cqw,88px)]">
        <h1 className="rise sr-only font-display font-black tracking-[-0.03em] desk:not-sr-only desk:text-[clamp(54px,7.6cqw,124px)] desk:leading-[0.92] desk:text-shadow-[0_2px_28px_rgba(20,40,55,.35)]">
          <span className="block">{t.line1}</span> <span className="block">{t.line2}</span>{" "}
          <span className="block text-strawberry-cream">{t.line3}</span>
        </h1>
        <p className="rise hidden max-w-[32ch] font-body text-[clamp(18px,1.6cqw,22px)] leading-[1.45] font-medium text-pretty [animation-delay:120ms] desk:block">
          {t.lead}
        </p>

        {/* Phones: just the button, sitting above the ticker's scallops */}
        <Link
          href={routes(lang).order}
          className="btn btn-light btn-lg w-full max-w-[460px] desk:hidden"
        >
          {orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
        </Link>

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
    </section>
  );
}
