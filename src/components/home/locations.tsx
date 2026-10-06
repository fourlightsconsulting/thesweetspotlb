import Link from "next/link";
import { OpenStatus } from "@/components/open-status";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

const branchName = "font-display text-[clamp(30px,2.6cqw,38px)] leading-[1.1] font-black";
const hoursRow = "flex justify-between gap-3 border-t border-dashed border-chocolate/30 py-3";

type Props = { lang: Locale; t: Dictionary["locations"]; orderNow: string };

export function Locations({ lang, t, orderNow }: Props) {
  return (
    <section id="locations" className="pt-[clamp(72px,8cqw,128px)] pb-[clamp(100px,10cqw,150px)]">
      <Reveal className="shell grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-[clamp(36px,4cqw,64px)]">
        <h2 className="font-display text-[clamp(46px,5.4cqw,80px)] leading-[0.95] font-black tracking-[-0.035em] text-balance">
          {t.title}
        </h2>

        <div className="flex flex-col gap-3.5 font-ui text-[15px] leading-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={branchName}>{t.tripoli}</h3>
            <OpenStatus openLabel={t.openNow} closedLabel={t.closedNow} />
          </div>
          <span className="text-cacao">{t.tripoliNote}</span>
          <div className="flex flex-col border-b border-dashed border-chocolate/30">
            <div className={hoursRow}>
              <span>{t.monThu}</span>
              <span className="font-semibold">{t.tripoliWeekHours}</span>
            </div>
            <div className={hoursRow}>
              <span>{t.friSun}</span>
              <span className="font-semibold">{t.tripoliWeekendHours}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <Link href={routes(lang).order} className="btn btn-primary">
              {orderNow}
            </Link>
            <a
              href={site.tripoliDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              {t.directions}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 font-ui text-[15px] leading-5">
          <h3 className={`${branchName} min-h-8`}>{t.kaslik}</h3>
          <span className="text-cacao">{t.kaslikNote}</span>
          <div className={`${hoursRow} border-b`}>
            <span>{t.everyDay}</span>
            <span className="font-semibold">{t.kaslikHours}</span>
          </div>
          <div className="mt-2">
            <a href={site.totersUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              {t.orderToters}
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
