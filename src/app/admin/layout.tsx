import type { Metadata, Viewport } from "next";
import { arabicText, googleSans } from "../fonts";
import "./admin.css";

// The admin's own root layout (the website's is app/[lang]/layout.tsx). It
// lives on admin.<domain>; next.config.ts sends /admin there.

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Sweet Spot admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#fff8ee" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`${googleSans.variable} ${arabicText.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
