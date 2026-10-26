import { whatsappUrl } from "@/components/social-links";
import { OpenStatus } from "@/components/open-status";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatPhoneLocal } from "@/lib/phone";
import { weekHours, type Schedule } from "@/lib/hours";

type Props = {
  lang: Locale;
  t: Dictionary["contact"];
  social: Dictionary["social"];
  /** The Tripoli branch's number (E.164), for WhatsApp and calls; those rows hide without one. */
  phone: string | null;
  hours: Schedule;
  mapsUrl: string | null;
  locations: Dictionary["locations"];
};

/**
 * The contact page: WhatsApp, a call, then Instagram, Facebook and TikTok.
 * A shop card with opening hours, beside the contact channels.
 * Taps are recorded by SiteTracking from where each link goes.
 */
export function ContactLines({ lang, t, social, phone, hours, mapsUrl, locations }: Props) {
  const number = phone ? `+961 ${formatPhoneLocal(phone)}` : "";
  const openingHours = weekHours(hours, lang, locations);
  const handle = `@${site.instagramHandle}`;
  const rows = [
    ...(phone
      ? [
          { label: social.whatsapp, note: t.whatsappNote, value: number, href: whatsappUrl(phone) },
          { label: t.call, note: t.callNote, value: number, href: `tel:${phone}` },
        ]
      : []),
    { label: social.instagram, note: t.instagramNote, value: handle, href: site.instagramUrl },
    {
      label: social.facebook,
      note: t.facebookNote,
      value: new URL(site.facebookUrl).pathname.slice(1),
      href: site.facebookUrl,
    },
    { label: social.tiktok, note: t.tiktokNote, value: handle, href: site.tiktokUrl },
  ];

  return (
    <section className="pt-[clamp(32px,4cqw,64px)] pb-section">
      <Reveal className="shell grid items-start gap-[clamp(36px,4cqw,64px)] desk:grid-cols-[minmax(0,.9fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col items-start gap-[18px]">
          <span className="eyebrow text-blueberry">{t.tag}</span>
          <h1 className="title-section">{t.title}</h1>
          <p className="max-w-[34ch] font-body text-[clamp(17px,1.3cqw,19px)] leading-normal font-medium text-pretty text-ink-soft">
            {t.description}
          </p>
          <section
            className="mt-3 w-full max-w-[520px] rounded-[24px] border-2 border-ink bg-strawberry-cream p-5 shadow-[4px_5px_0_var(--color-ink)] sm:p-6"
            aria-labelledby="visit-title"
          >
            <p className="eyebrow text-blueberry">{t.visit}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h2
                id="visit-title"
                className="font-display text-[28px] leading-tight font-bold text-blueberry"
              >
                {t.locationValue}
              </h2>
              <OpenStatus
                schedule={hours}
                openLabel={locations.openNow}
                closedLabel={locations.closedNow}
              />
            </div>
            <dl className="mt-5 border-t border-dashed border-ink/25 font-ui text-[15px]">
              {openingHours.map((row) => (
                <div
                  key={row.days}
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-dashed border-ink/25 py-3"
                >
                  <dt>{row.days}</dt>
                  <dd className="font-semibold">{row.hours}</dd>
                </div>
              ))}
            </dl>
            <a
              href={mapsUrl || site.tripoliDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-5 w-full"
            >
              {locations.directions} <span aria-hidden="true">{forwardArrow(lang)}</span>
            </a>
          </section>
        </div>

        <div className="w-full min-w-0 overflow-hidden rounded-[24px] border-[1.5px] border-ink/15 bg-whipped">
          {rows.map((row) => (
            <a
              key={row.label}
              href={row.href}
              {...(row.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-ink/12 p-5 transition-colors duration-200 last:border-b-0 hover:bg-pink-tint focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-raspberry sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-6"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-[clamp(22px,1.9cqw,28px)] leading-[1.15] font-black text-blueberry">
                  {row.label}
                </span>
                <span className="font-ui text-sm leading-[18px] text-ink-soft">{row.note}</span>
              </span>
              {/* Numbers and handles read left to right in Arabic too. */}
              <span
                dir="ltr"
                className="col-start-1 row-start-2 w-fit max-w-full justify-self-start font-ui text-[15px] font-semibold break-all sm:col-start-2 sm:row-start-1"
              >
                {row.value}
              </span>
              <span
                aria-hidden="true"
                className="col-start-2 row-span-2 row-start-1 font-ui text-xl font-bold text-blueberry sm:col-start-3 sm:row-span-1"
              >
                {forwardArrow(lang)}
              </span>
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
