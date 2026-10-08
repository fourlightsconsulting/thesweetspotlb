import Link from "next/link";
import { OpenStatus } from "@/components/open-status";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";
import { type Schedule, weekHours } from "@/lib/hours";

const branchName = "font-display text-[clamp(30px,2.6cqw,38px)] leading-[1.1] font-black";
const hoursRow = "flex justify-between gap-3 border-t border-dashed border-chocolate/30 py-3";

type Props = {
  lang: Locale;
  t: Dictionary["locations"];
  orderNow: string;
  /** Each branch's week, from the database. */
  hours: { tripoli: Schedule; kaslik: Schedule };
};

export function Locations({ lang, t, orderNow, hours }: Props) {
  const tripoliRows = weekHours(hours.tripoli, lang, t);
  const kaslikRows = weekHours(hours.kaslik, lang, t);

  return (
    <section id="locations" className="pt-section pb-section-lg">
      <Reveal className="shell grid items-start gap-[clamp(36px,4cqw,64px)] desk:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <h2 className="title-section">{t.title}</h2>

        {/* The two branches: stacked with a divider on phones, side by side with a
            thin vertical rule from 640px. */}
        <div className="grid sm:grid-cols-2">
          <div className="flex flex-col gap-3.5 pb-10 font-ui text-[15px] leading-5 sm:pe-[clamp(28px,3.5cqw,56px)] sm:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className={branchName}>{t.tripoli}</h3>
              <OpenStatus
                schedule={hours.tripoli}
                openLabel={t.openNow}
                closedLabel={t.closedNow}
              />
            </div>
            <span className="text-cacao">{t.tripoliNote}</span>
            <div className="flex flex-col border-b border-dashed border-chocolate/30">
              {tripoliRows.map((row) => (
                <div key={row.days} className={hoursRow}>
                  <span>{row.days}</span>
                  <span className="font-semibold">{row.hours}</span>
                </div>
              ))}
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

          <div className="flex flex-col gap-3.5 border-t-[1.5px] border-chocolate/15 pt-10 font-ui text-[15px] leading-5 sm:border-s-[1.5px] sm:border-t-0 sm:ps-[clamp(28px,3.5cqw,56px)] sm:pt-0">
            <h3 className={`${branchName} min-h-8`}>{t.kaslik}</h3>
            <span className="text-cacao">{t.kaslikNote}</span>
            <div className="flex flex-col border-b border-dashed border-chocolate/30">
              {kaslikRows.map((row) => (
                <div key={row.days} className={hoursRow}>
                  <span>{row.days}</span>
                  <span className="font-semibold">{row.hours}</span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <a
                href={site.totersUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                {t.orderToters}
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
