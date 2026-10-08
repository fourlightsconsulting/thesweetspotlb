"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { routes } from "@/i18n/routes";
import { track } from "@/lib/analytics";
import type { WelcomePopup as Popup } from "@/lib/site-settings";

// The welcome offer, set in the admin (Site). Shown once per visitor (again
// after `repeat_after_days`, or as soon as the offer changes), never while
// checking out or on an order's page. `?popup=1` previews it, even when off.

const STORAGE_KEY = "tss-welcome-popup";

type Props = { popup: Popup; lang: Locale; t: Dictionary["popup"] };

/** Where the button goes, and whether it leaves the site. */
function destination(popup: Popup, lang: Locale) {
  const target = popup.cta.target;
  const r = routes(lang);
  if (target === "order") return { href: r.order, external: false };
  if (target.startsWith("item:")) return { href: r.item(target.slice(5)), external: false };
  if (target.startsWith("category:")) return { href: r.category(target.slice(9)), external: false };
  return { href: target, external: true };
}

export function WelcomePopup({ popup, lang, t }: Props) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const signature = `${popup.code ?? ""}|${popup.title.en}|${popup.body.en}`;

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has("popup");
    if (!preview) {
      if (!popup.enabled) return;
      const page = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
      if (/^\/(checkout|orders)(\/|$)/.test(page)) return;
      if (popup.pages === "home" && page !== "/") return;
      try {
        const seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
          at: number;
          signature: string;
        } | null;
        const fresh = seen && Date.now() - seen.at < popup.repeat_after_days * 86_400_000;
        if (seen?.signature === signature && fresh) return;
      } catch {}
    }

    const timer = setTimeout(
      () => {
        // Never on top of another sheet (an item, the cart).
        if (document.querySelector("dialog[open]")) return;
        dialogRef.current?.showModal();
        track("popup_viewed", { code: popup.code ?? undefined });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), signature }));
        } catch {}
      },
      preview ? 300 : popup.delay_seconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [pathname, popup, signature]);

  const close = (reason: "button" | "backdrop") => {
    dialogRef.current?.close();
    track("popup_dismissed", { via: reason });
  };
  const { href, external } = destination(popup, lang);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-title"
      className="welcome-popup"
      onClick={(e) => {
        if (e.target === e.currentTarget) close("backdrop");
      }}
    >
      <div className="relative flex flex-col items-start gap-4 p-[clamp(24px,5vw,36px)]">
        <button
          type="button"
          onClick={() => close("button")}
          aria-label={t.close}
          className="absolute end-3 top-3 flex size-11 items-center justify-center rounded-full text-chocolate transition-colors hover:bg-strawberry-cream"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6 fill-none stroke-current stroke-[2.4] [stroke-linecap:round]"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <h2
          id="welcome-title"
          className="pe-10 font-display text-[clamp(30px,6vw,40px)] leading-[1.02] font-black tracking-[-0.02em] text-balance text-blueberry"
        >
          {popup.title[lang]}
        </h2>
        <p className="font-ui text-[16px] leading-[1.5]">{popup.body[lang]}</p>
        {popup.code && (
          <div className="flex w-full items-center justify-between gap-3 rounded-[14px] border-[2.5px] border-dashed border-chocolate/50 bg-whipped px-4 py-2.5">
            <span className="flex flex-col">
              <span className="font-ui text-[12px] font-bold tracking-[0.06em] text-cacao uppercase">
                {t.code}
              </span>
              <span dir="ltr" className="font-ui text-[22px] font-extrabold tracking-[0.08em]">
                {popup.code}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(popup.code!).then(() => setCopied(true));
                track("popup_code_copied", { code: popup.code });
              }}
              className="btn btn-secondary btn-sm"
            >
              {copied ? t.copied : t.copy}
            </button>
          </div>
        )}
        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              track("popup_cta", { target: popup.cta.target });
              dialogRef.current?.close();
            }}
            className="btn btn-primary btn-lg w-full"
          >
            {popup.cta.label[lang]}
          </a>
        ) : (
          <Link
            href={href}
            onClick={() => {
              track("popup_cta", { target: popup.cta.target });
              dialogRef.current?.close();
            }}
            className="btn btn-primary btn-lg w-full"
          >
            {popup.cta.label[lang]}
          </Link>
        )}
      </div>
    </dialog>
  );
}
