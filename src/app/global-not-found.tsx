import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found · The Sweet Spot",
};

// Unmatched URLs have no locale, so this page is bilingual.
export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p lang="ar" dir="rtl" className="text-2xl">
          الصفحة غير موجودة
        </p>
        <nav className="flex gap-6">
          <Link href="/en">Home</Link>
          <Link href="/ar" lang="ar">
            الرئيسية
          </Link>
        </nav>
      </body>
    </html>
  );
}
