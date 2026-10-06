"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useSyncExternalStore } from "react";
import logo from "@/assets/images/logo-blueberry.png";
import { site } from "@/data/site";
import { forwardArrow, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";

const subscribeToScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isScrolled = () => window.scrollY > 12;
const isScrolledOnServer = () => false;

/** Extra copy for the side menu, picked from the dictionary by the layout. */
export type MenuExtras = {
  orderNow: string;
  branch: string;
  hours: string[];
  follow: string;
};

type Props = {
  lang: Locale;
  nav: Dictionary["nav"];
  menu: MenuExtras;
  cartCount?: number;
};

export function SiteHeader({ lang, nav, menu, cartCount = 0 }: Props) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
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
  const openDrawer = () => drawerRef.current?.showModal();
  const closeDrawer = () => drawerRef.current?.close();

  const langSwitch = (
    <Link
      href={switchHref}
      lang={otherLang}
      hrefLang={otherLang}
      onClick={closeDrawer}
      className="inline-flex min-h-10 items-center rounded-full border-[1.5px] border-chocolate/20 px-3.5 font-ui text-sm font-semibold transition-colors duration-200 hover:border-strawberry-cream hover:bg-strawberry-cream"
    >
      {nav.langSwitch}
    </Link>
  );

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="group/header sticky top-0 z-40 border-b border-chocolate/8 bg-vanilla transition-shadow duration-300 data-scrolled:shadow-[0_10px_24px_-20px_rgba(53,37,34,.6)]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-[clamp(10px,2.2cqw,36px)] px-[clamp(16px,4.5cqw,72px)] py-1.5">
        <Link
          href={r.home}
          aria-label={nav.home}
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

        {langSwitch}

        <Link
          href={r.order}
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
          onClick={openDrawer}
          aria-haspopup="dialog"
          aria-controls="site-menu"
          aria-label={nav.openMenu}
          className="inline-flex size-11 items-center justify-center rounded-xl border-[1.5px] border-chocolate/20 desk:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[22px] fill-none stroke-current stroke-[2.2] [stroke-linecap:round]"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Side menu: slides in from the inline end (right in English, left in Arabic). */}
      <dialog
        ref={drawerRef}
        id="site-menu"
        aria-label={nav.menuLabel}
        className="drawer"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDrawer(); // click on the backdrop
        }}
      >
        <div className="flex min-h-full flex-col px-6 pt-4 pb-8">
          <div className="flex items-center justify-between">
            <Link href={r.home} aria-label={nav.home} onClick={closeDrawer}>
              <Image src={logo} alt="The Sweet Spot" sizes="64px" className="h-auto w-16" />
            </Link>
            <div className="flex items-center gap-3">
              {langSwitch}
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={nav.closeMenu}
                className="btn btn-secondary btn-sm size-11 rounded-full p-0"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5 fill-none stroke-current stroke-[2.4] [stroke-linecap:round]"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="mt-8 flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeDrawer}
                aria-current={pathname === link.href ? "page" : undefined}
                className="group flex items-center justify-between border-b border-dashed border-chocolate/20 py-4 font-display text-[30px] leading-[1.1] font-black tracking-[-0.02em] aria-[current=page]:text-blueberry"
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="font-ui text-xl text-blueberry transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                >
                  {forwardArrow(lang)}
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-6 pt-10">
            <Link href={r.order} onClick={closeDrawer} className="btn btn-primary btn-lg w-full">
              {menu.orderNow} <span aria-hidden="true">{forwardArrow(lang)}</span>
            </Link>
            <div className="font-ui text-sm leading-[1.6]">
              <p className="font-semibold">{menu.branch}</p>
              {menu.hours.map((line) => (
                <p key={line} className="text-cacao">
                  {line}
                </p>
              ))}
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-semibold text-blueberry"
              >
                {menu.follow}
              </a>
            </div>
          </div>
        </div>
      </dialog>
    </header>
  );
}
