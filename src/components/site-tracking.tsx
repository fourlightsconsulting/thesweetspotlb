"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track, trackPageView } from "@/lib/tracking";

// The website's page views, outbound taps and script errors, in one place,
// so individual links and components don't need tracking code.

/** What a tapped link is, from where it goes. */
function linkEvent(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") ?? "";
  if (href.startsWith("tel:")) return { name: "contact_click", channel: "phone" } as const;
  let url: URL;
  try {
    url = new URL(href, location.href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "wa.me" || host.endsWith("whatsapp.com"))
    return { name: "contact_click", channel: "whatsapp" } as const;
  if (/(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps"))
    return { name: "directions_click" } as const;
  if (host === "maps.app.goo.gl" || host === "goo.gl") return { name: "directions_click" } as const;
  if (host.endsWith("instagram.com")) return { name: "instagram_click" } as const;
  if (host.endsWith("facebook.com")) return { name: "facebook_click" } as const;
  if (host.endsWith("tiktok.com")) return { name: "tiktok_click" } as const;
  // The language switch: the same page in the other language.
  const current = document.documentElement.lang;
  const target = url.origin === location.origin ? url.pathname.split("/")[1] : null;
  if ((target === "en" || target === "ar") && target !== current && anchor.hreflang)
    return { name: "language_switch", to: target } as const;
  return null;
}

const MAX_ERRORS_PER_PAGE = 3;

export function SiteTracking() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView();
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const found = linkEvent(anchor);
      if (!found) return;
      const { name, ...params } = found;
      track(name, { ...params, from: location.pathname });
    };

    let errors = 0;
    const report = (message: string, source?: string) => {
      // Browser extensions and harmless layout warnings aren't the site's errors.
      if (
        errors >= MAX_ERRORS_PER_PAGE ||
        !message ||
        message === "Script error." ||
        /ResizeObserver loop/.test(message) ||
        /extension:\/\//.test(source ?? "")
      )
        return;
      errors++;
      track("client_error", { message: message.slice(0, 200), source: source?.slice(0, 200) });
    };
    const onError = (event: ErrorEvent) => report(event.message, event.filename);
    const onRejection = (event: PromiseRejectionEvent) =>
      report(event.reason instanceof Error ? event.reason.message : String(event.reason ?? ""));

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

/** For the not-found page, which sits outside the site's layout. */
export function NotFoundTracking() {
  useEffect(() => {
    track("not_found", { requested: location.pathname.slice(0, 200) });
  }, []);
  return null;
}
