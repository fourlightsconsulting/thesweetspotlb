import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/images/logo-blueberry.png";
import { NotFoundTracking } from "@/components/site-tracking";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found · The Sweet Spot",
};

/** A tipped-over cone melting into a puddle. */
function MeltedCone() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 48"
      className="w-[clamp(150px,16cqw,210px)] overflow-visible stroke-chocolate stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <path
        className="fill-strawberry-cream"
        d="M6 40 C 6 34, 16 32, 24 33 C 30 30, 40 31, 46 34 C 54 34, 60 37, 58 41 C 56 44, 44 44, 34 43.5 C 24 44.5, 8 45, 6 40 Z"
      />
      <path
        className="fill-strawberry-cream"
        d="M18 36 C 17 28, 22 23, 29 23 C 36 23, 41 28, 40 35 C 33 37.5, 24 37.5, 18 36 Z"
      />
      <path
        className="fill-toffee"
        d="M37 26 L59 15 C 59.6 14.8, 59.9 15.3, 59.5 15.8 L41.5 33 Z"
      />
      <path className="fill-none" d="M45.5 21.7 L48.5 25.7 M51.1 18.9 L52.9 21.3" />
      <path
        className="fill-strawberry-cream"
        d="M12 29.5 C 12 27.6, 14.4 27.6, 14.4 29.5 C 14.4 31, 12 31, 12 29.5 Z"
      />
    </svg>
  );
}

// Unmatched URLs have no locale, so this page is bilingual. Until the order and
// contact pages exist, their links land here too.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="page flex min-h-full flex-col">
        <NotFoundTracking />
        <div aria-hidden="true" className="awning" />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-section-sm text-center">
          <Link href="/en" aria-label="The Sweet Spot home">
            <Image
              src={logo}
              alt="The Sweet Spot"
              sizes="96px"
              className="h-auto w-24"
              loading="eager"
            />
          </Link>
          <MeltedCone />
          <div className="flex flex-col items-center gap-3">
            <h1 className="title-section">This page melted.</h1>
            <p className="font-body text-lg leading-normal font-medium text-cacao">
              It may have moved, or it isn’t ready yet.
            </p>
          </div>
          <div lang="ar" dir="rtl" className="flex flex-col items-center gap-1">
            <p className="font-(family-name:--font-ar-display) text-[clamp(28px,3cqw,40px)] leading-[1.3] font-extrabold">
              هالصفحة دابت.
            </p>
            <p className="font-(family-name:--font-ar-text) text-base leading-normal text-cacao">
              يمكن انتقلت، أو بعدها مش جاهزة.
            </p>
          </div>
          <nav className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/en" className="btn btn-primary">
              Back to home
            </Link>
            <Link
              href="/ar"
              lang="ar"
              className="btn btn-secondary font-(family-name:--font-ar-text)"
            >
              الصفحة الرئيسية
            </Link>
          </nav>
        </main>
        <div
          aria-hidden="true"
          className="scallop-top relative h-10 bg-blueberry [--scallop:var(--color-blueberry)]"
        />
      </body>
    </html>
  );
}
