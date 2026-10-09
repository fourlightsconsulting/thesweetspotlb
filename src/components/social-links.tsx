import { site } from "@/data/site";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { SocialIcon, type SocialNetwork } from "./icons";

// The shop's accounts as round buttons: in the footer and the phone menu.
// Taps are recorded by SiteTracking from where each link goes.

export type SocialLink = { network: SocialNetwork; href: string; label: string };

/** A WhatsApp chat with an E.164 number. */
export const whatsappUrl = (phone: string) => `https://wa.me/${phone.replace(/^\+/, "")}`;

/** Instagram, WhatsApp (with the branch's number), Facebook and TikTok, in that order. */
export function socialLinks(labels: Dictionary["social"], phone: string | null): SocialLink[] {
  return [
    { network: "instagram", href: site.instagramUrl, label: labels.instagram },
    ...(phone
      ? [{ network: "whatsapp" as const, href: whatsappUrl(phone), label: labels.whatsapp }]
      : []),
    { network: "facebook", href: site.facebookUrl, label: labels.facebook },
    { network: "tiktok", href: site.tiktokUrl, label: labels.tiktok },
  ];
}

/** `className` colours the buttons (border, text and hover). */
export function SocialLinks({
  links,
  className = "",
}: {
  links: SocialLink[];
  className?: string;
}) {
  return (
    <ul className="flex flex-wrap gap-2.5">
      {links.map((link) => (
        <li key={link.network}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
            title={link.label}
            className={`flex size-11 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${className}`}
          >
            <SocialIcon network={link.network} className="size-[22px]" />
          </a>
        </li>
      ))}
    </ul>
  );
}
