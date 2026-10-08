import Image from "next/image";
import Link from "next/link";
import logoPink from "@/assets/images/logo-pink.png";
import { MenuIcon, menuIconNames } from "@/components/icons";
import { site } from "@/data/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

/** `hours`: the Tripoli branch's week, one line per run of days ("Mon–Thu · 12 pm – 12 am"). */
type Props = { lang: Locale; dict: Dictionary; hours: string[] };

export function SiteFooter({ lang, dict, hours }: Props) {
  const r = routes(lang);
  const { nav, locations: loc, footer, instagram } = dict;
  const links = [
    { href: r.order, label: nav.menu },
    { href: r.category("boxes"), label: nav.boxes },
    { href: r.about, label: nav.story },
    { href: r.contact, label: nav.locations },
  ];

  return (
    <footer className="scallop-top relative bg-blueberry text-vanilla [--scallop:var(--color-blueberry)]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-start gap-9 px-[clamp(20px,5cqw,72px)] pt-section-sm pb-8">
        <div className="flex flex-col items-start gap-4">
          <Image src={logoPink} alt="The Sweet Spot" sizes="150px" className="h-auto w-[150px]" />
          <span className="font-script text-[28px] leading-[1.35] text-strawberry-cream">
            {footer.tagline}
          </span>
          <span className="flex flex-wrap gap-2.5">
            {menuIconNames.map((name) => (
              <MenuIcon key={name} name={name} className="size-7 stroke-strawberry-cream" />
            ))}
          </span>
        </div>

        <nav className="flex flex-col items-start gap-3 font-ui text-base font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-strawberry-cream"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2.5 font-ui text-[15px] leading-[22px]">
          <span className="font-semibold">{loc.tripoli}</span>
          {hours.map((line) => (
            <span key={line} className="text-vanilla/85">
              {line}
            </span>
          ))}
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 font-semibold text-strawberry-cream transition-colors hover:text-vanilla"
          >
            {instagram.follow}
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-vanilla/16 px-[clamp(20px,5cqw,72px)] pt-[18px] pb-7 font-ui text-[13px] text-vanilla/82">
        <span>{footer.rights}</span>
      </div>
    </footer>
  );
}
