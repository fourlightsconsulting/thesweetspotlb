"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import logo from "@/assets/images/logo-blueberry.png";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

const subscribeToScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isScrolled = () => window.scrollY > 12;
const isScrolledOnServer = () => false;

type Props = {
  lang: Locale;
  nav: Dictionary["nav"];
  cartCount?: number;
};

export function SiteHeader({ lang, nav, cartCount = 0 }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, isScrolledOnServer);

  const r = routes(lang);
  const otherLang: Locale = lang === "en" ? "ar" : "en";
  const switchHref = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${otherLang}`);
  const links = [
    { href: r.order, label: nav.menu },
    { href: r.category("boxes"), label: nav.boxes },
    { href: r.about, label: nav.story },
    { href: r.contact, label: nav.locations },
  ];
  const close = () => setMenuOpen(false);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="group/header sticky top-0 z-40 border-b border-chocolate/8 bg-vanilla transition-shadow duration-300 data-scrolled:shadow-[0_10px_24px_-20px_rgba(53,37,34,.6)]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-[clamp(10px,2.2cqw,36px)] px-[clamp(16px,4.5cqw,72px)] py-1.5">
        <Link
          href={r.home}
          aria-label={nav.home}
          onClick={close}
          className="flex shrink-0 transition-transform duration-300 ease-soft hover:scale-104 hover:-rotate-4"
        >
          <Image
            src={logo}
            alt="The Sweet Spot"
            loading="eager"
            sizes="96px"
            className="h-auto w-[72px] transition-[width] duration-300 ease-soft desk:w-24 desk:group-data-scrolled/header:w-[72px]"
          />
        </Link>

        <nav className="hidden gap-[clamp(18px,2cqw,32px)] font-ui text-[15px] leading-5 font-medium desk:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="py-2 underline decoration-transparent decoration-2 underline-offset-8 transition-[text-decoration-color] duration-200 hover:decoration-caramel aria-[current=page]:decoration-caramel"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <Link
          href={switchHref}
          lang={otherLang}
          hrefLang={otherLang}
          onClick={close}
          className="inline-flex min-h-10 items-center rounded-full border-[1.5px] border-chocolate/20 px-3.5 font-ui text-sm font-semibold transition-colors duration-200 hover:border-strawberry-cream hover:bg-strawberry-cream"
        >
          {nav.langSwitch}
        </Link>

        <Link
          href={r.order}
          onClick={close}
          aria-label={`${nav.cart} (${cartCount})`}
          className="btn btn-primary btn-sm gap-2"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          </svg>
          <span>
            <span className="hidden desk:inline">{nav.cart} · </span>
            {cartCount}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? nav.closeMenu : nav.openMenu}
          className="inline-flex size-11 items-center justify-center rounded-xl border-[1.5px] border-chocolate/20 desk:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[22px] fill-none stroke-current stroke-[2.2] [stroke-linecap:round]"
          >
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-1 border-t border-chocolate/8 px-5 pt-2 pb-[22px] font-display text-[28px] leading-[1.2] font-bold desk:hidden"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className="py-2.5">
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
