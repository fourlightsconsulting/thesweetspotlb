import { whatsappUrl } from "@/components/social-links";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatPhoneLocal } from "@/lib/phone";

type Props = {
  lang: Locale;
  t: Dictionary["contact"];
  social: Dictionary["social"];
  /** The Tripoli branch's number (E.164), for WhatsApp and calls; those rows hide without one. */
  phone: string | null;
};

/**
 * The contact page: WhatsApp, a call, then Instagram, Facebook and TikTok.
 * Typographic rows between chocolate rules, like the boxes on the home page.
 * Taps are recorded by SiteTracking from where each link goes.
 */
export function ContactLines({ lang, t, social, phone }: Props) {
  const number = phone ? `+961 ${formatPhoneLocal(phone)}` : "";
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
    <section className="pt-[clamp(28px,3.4cqw,52px)] pb-section-lg">
      <Reveal className="shell grid items-start gap-[clamp(36px,4cqw,64px)] desk:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col items-start gap-[18px]">
          <span className="eyebrow text-blueberry">{t.tag}</span>
          <h1 className="title-section">{t.title}</h1>
          <p className="max-w-[34ch] font-body text-[clamp(17px,1.3cqw,19px)] leading-normal font-medium text-pretty text-cacao">
            {t.description}
          </p>
        </div>

        <div className="w-full border-t-[1.5px] border-chocolate">
          {rows.map((row) => (
            <a
              key={row.label}
              href={row.href}
              {...(row.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              className="flex w-full items-center justify-between gap-4 border-b-[1.5px] border-chocolate py-5 transition-colors duration-200 hover:text-blueberry"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-[clamp(22px,1.9cqw,28px)] leading-[1.15] font-black">
                  {row.label}
                </span>
                <span className="font-ui text-sm leading-[18px] text-cacao">{row.note}</span>
              </span>
              <span className="flex items-center gap-3.5">
                {/* Numbers and handles read left to right in Arabic too. */}
                <span dir="ltr" className="font-ui text-[15px] font-semibold whitespace-nowrap">
                  {row.value}
                </span>
                <span aria-hidden="true" className="font-ui text-xl font-bold text-blueberry">
                  {forwardArrow(lang)}
                </span>
              </span>
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
