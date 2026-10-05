import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Underline } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { categories, formatPrice, lowestPrice } from "@/data/menu";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

// Each sticker card sits slightly crooked; it straightens up on hover.
const tilt = ["-1.6deg", "1.8deg", "-1deg", "2.2deg", "1.4deg", "-2deg", "1.2deg", "-1.4deg"];

const card =
  "flex min-w-0 snap-start flex-col items-stretch gap-[clamp(10px,1cqw,14px)] rounded-[clamp(16px,1.5cqw,22px)] border-[2.5px] border-chocolate p-[clamp(8px,0.8cqw,12px)] pb-[clamp(14px,1.4cqw,20px)] text-start shadow-[5px_5px_0_var(--color-chocolate)] transition-[transform,box-shadow] duration-300 ease-soft [transform:rotate(var(--rot))] hover:shadow-[8px_10px_0_var(--color-chocolate)] hover:[transform:rotate(0deg)_translate(-2px,-5px)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-caramel";

const cardName =
  "font-display text-[clamp(19px,1.9cqw,28px)] leading-[1.08] font-black tracking-[-0.015em] text-balance";

type Props = {
  lang: Locale;
  t: Dictionary["categories"];
  from: string;
};

// Bottom padding leaves room for the weekly special cup, which rises into this
// section (see weekly-special.tsx; the two min()/clamp() values must agree).
export function Categories({ lang, t, from }: Props) {
  const r = routes(lang);

  return (
    <section
      id="menu"
      className="bg-strawberry-cream pt-[clamp(56px,6.4cqw,104px)] pb-[calc(min(26cqw,112px)+28px)] desk:pb-[clamp(124px,11cqw,160px)]"
    >
      <Reveal className="shell" threshold={0.1}>
        <h2 className="mb-[clamp(24px,3cqw,44px)] font-display text-[clamp(38px,4.6cqw,68px)] leading-[1.02] font-black tracking-[-0.025em] text-balance">
          {t.titleStart}{" "}
          <span className="relative inline-block whitespace-nowrap">
            {t.titleEnd}
            <Underline className="absolute -start-[2%] -bottom-[0.17em] h-[0.27em] w-[104%]" />
          </span>
        </h2>

        <div className="drop-in -mx-[clamp(20px,5cqw,72px)] grid snap-x snap-mandatory scroll-px-[clamp(20px,5cqw,72px)] [scrollbar-width:none] auto-cols-[min(64%,260px)] grid-flow-col gap-x-[clamp(14px,1.8cqw,26px)] gap-y-[clamp(18px,2.2cqw,32px)] overflow-x-auto px-[clamp(20px,5cqw,72px)] pt-2 pb-[22px] desk:mx-0 desk:grid-flow-row desk:grid-cols-4 desk:overflow-visible desk:p-0">
          {categories.map((category, i) => (
            <Link
              key={category.id}
              href={r.category(category.id)}
              className={`${card} bg-vanilla text-chocolate`}
              style={{ "--rot": tilt[i], "--i": i } as CSSProperties}
            >
              <Image
                src={category.image}
                alt=""
                sizes="(min-width: 820px) 22vw, 260px"
                className="aspect-square w-full rounded-[clamp(10px,1cqw,14px)] bg-strawberry-milk object-cover"
              />
              <span className="flex flex-col gap-1.5 px-1">
                <span className={cardName}>{category.name[lang]}</span>
                <span className="font-ui text-[clamp(13px,1.05cqw,15px)] leading-[1.4] text-pretty text-cacao">
                  {category.description[lang]}
                </span>
                <span className="mt-0.5 font-ui text-[13px] leading-4 font-semibold text-blueberry">
                  {from} {formatPrice(lowestPrice(category.id))}
                </span>
              </span>
            </Link>
          ))}

          <Link
            href={r.order}
            className={`${card} bg-blueberry text-vanilla`}
            style={{ "--rot": tilt[7], "--i": 7 } as CSSProperties}
          >
            <span className="flex aspect-square w-full items-center justify-center rounded-[clamp(10px,1cqw,14px)] candy-stripes">
              <span className="flex aspect-square w-[44%] items-center justify-center rounded-full border-[2.5px] border-chocolate bg-vanilla font-ui text-[clamp(28px,3.2cqw,52px)] leading-none font-bold text-blueberry">
                {forwardArrow(lang)}
              </span>
            </span>
            <span className="flex flex-col gap-1.5 px-1">
              <span className={cardName}>{t.allTitle}</span>
              <span className="font-ui text-[clamp(13px,1.05cqw,15px)] leading-[1.4] text-pretty">
                {t.allSub}
              </span>
            </span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
