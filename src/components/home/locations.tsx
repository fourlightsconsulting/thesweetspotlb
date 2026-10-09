import Link from "next/link";
import { OpenStatus } from "@/components/open-status";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";
import { type Schedule, weekHours } from "@/lib/hours";

const hoursRow = "flex justify-between gap-3 border-t border-dashed border-chocolate/30 py-3";

type Props = {
  lang: Locale;
  t: Dictionary["locations"];
  orderNow: string;
  /** The Tripoli branch's week, from the database. */
  hours: Schedule;
};

/** The shop: whether it's open, its hours, and the ways to get a dessert. */
export function Locations({ lang, t, orderNow, hours }: Props) {
  const rows = weekHours(hours, lang, t);

  return (
    <section id="locations" className="pt-section pb-section-lg">
      <Reveal className="shell grid items-start gap-[clamp(36px,4cqw,64px)] desk:grid-cols-2">
        <h2 className="title-section">{t.title}</h2>

        <div className="flex w-full max-w-[520px] flex-col gap-3.5 font-ui text-[15px] leading-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-[clamp(30px,2.6cqw,38px)] leading-[1.1] font-black">
              {t.tripoli}
            </h3>
            <OpenStatus schedule={hours} openLabel={t.openNow} closedLabel={t.closedNow} />
          </div>
          <span className="text-cacao">{t.tripoliNote}</span>
          <div className="flex flex-col border-b border-dashed border-chocolate/30">
            {rows.map((row) => (
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
      </Reveal>
    </section>
  );
}
