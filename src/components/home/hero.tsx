import Image from "next/image";
import Link from "next/link";
import photoIcecream from "@/assets/images/photo-icecream.png";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import photoWaffle from "@/assets/images/photo-waffle.png";
import { ArrowDownLeft, ArrowToButton } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

// Crossfading stills (18s loop, slow zoom) until the real hero video arrives.
const reel = [
  { src: photoWaffle, origin: "35% 60%" },
  { src: photoIcecream, origin: "65% 40%" },
  { src: photoProfiteroles, origin: "50% 55%" },
];

type Props = { lang: Locale; t: Dictionary["hero"]; orderNow: string };

export function Hero({ lang, t, orderNow }: Props) {
  return (
    <section className="relative h-[calc(100svh-150px)] min-h-[520px] overflow-hidden bg-blueberry text-vanilla desk:h-[min(calc(100svh-110px),820px)]">
      <div className="reel absolute inset-0">
        {reel.map((photo, i) => (
          <Image
            key={photo.origin}
            src={photo.src}
            alt=""
            fill
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            sizes="100vw"
            className="object-cover"
            style={{ transformOrigin: photo.origin, animationDelay: `${i * 6 - 1}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 hero-scrim" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-3 awning" />

      <div className="relative z-2 mx-auto flex h-full max-w-[1440px] flex-col items-start justify-end gap-[clamp(16px,1.8cqw,26px)] px-[clamp(20px,5cqw,72px)] pt-[72px] pb-[clamp(28px,5cqw,88px)]">
        <h1 className="rise flex flex-col font-display text-[clamp(54px,7.6cqw,124px)] leading-[0.92] font-black tracking-[-0.03em] text-shadow-[0_2px_28px_rgba(20,40,55,.35)]">
          <span>{t.line1}</span>
          <span>{t.line2}</span>
          <span className="text-strawberry-cream">{t.line3}</span>
        </h1>
        <p className="rise hidden max-w-[32ch] font-body text-[clamp(18px,1.6cqw,22px)] leading-[1.45] font-medium text-pretty [animation-delay:120ms] desk:block">
          {t.lead}
        </p>

        {/* Mobile: note above a full-width button */}
        <Reveal className="w-full [--draw-delay:.7s] desk:hidden">
          <div className="flex items-end justify-end text-vanilla" aria-hidden="true">
            <ArrowDownLeft className="mb-1 h-[38px] w-10 stroke-current rtl:-scale-x-100" />
            <span className="mb-[22px] -rotate-4 font-script text-[19px] leading-[1.2] whitespace-nowrap">
              {t.note}
            </span>
          </div>
          <Link href={routes(lang).order} className="btn btn-light btn-lg w-full">
            {orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
          </Link>
        </Reveal>

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
